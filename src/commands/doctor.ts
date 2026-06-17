import { stat, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { detectCodex } from '../core/codex.js';
import { readCodexConfig } from '../core/codexConfig.js';
import { readGitInfo } from '../core/git.js';
import { listSessions } from '../core/sessionReader.js';
import { appConfigExists } from '../config/appConfig.js';
import { codexConfigPath, codexSessionsDir, tildify } from '../core/paths.js';
import { DATA_DISCLOSURE } from '../core/privacy.js';
import { ConfigParseError } from '../core/errors.js';

type Level = 'pass' | 'warn' | 'fail';
interface Check {
  level: Level;
  label: string;
  detail?: string;
}

const ICON: Record<Level, string> = { pass: '✅', warn: '⚠️ ', fail: '❌' };

export async function runDoctor(): Promise<number> {
  const checks: Check[] = [];

  const major = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);
  checks.push(
    major >= 18
      ? { level: 'pass', label: `Node.js ${process.versions.node}` }
      : { level: 'fail', label: `Node.js ${process.versions.node} (requires >=18)` },
  );

  const codex = await detectCodex();
  checks.push(
    codex.found
      ? { level: 'pass', label: `Codex CLI found (v${codex.version ?? 'unknown'})` }
      : { level: 'fail', label: 'Codex CLI not found', detail: codex.error },
  );

  checks.push(await checkConfig());
  checks.push(await checkSessionsDir());
  checks.push(await checkSessionReadable());

  const git = await readGitInfo(process.cwd());
  checks.push(
    git.isRepo
      ? { level: 'pass', label: `Git repo (${git.branch ?? 'detached'})` }
      : { level: 'warn', label: 'Current directory is not a git repo' },
  );

  checks.push(await checkStatusLine());

  checks.push(
    (await appConfigExists())
      ? { level: 'pass', label: 'codex-hud config found' }
      : { level: 'warn', label: 'codex-hud config not found — run `codex-hud setup`' },
  );

  checks.push({ level: 'pass', label: 'No credentials read (local-only)' });

  process.stdout.write('Codex HUD Doctor\n\n');
  for (const c of checks) {
    process.stdout.write(`${ICON[c.level]} ${c.label}${c.detail ? `  (${c.detail})` : ''}\n`);
  }
  printDisclosure();

  return checks.some((c) => c.level === 'fail') ? 1 : 0;
}

async function checkConfig(): Promise<Check> {
  try {
    const cfg = await readCodexConfig(codexConfigPath());
    return cfg
      ? { level: 'pass', label: `Codex config found (${tildify(codexConfigPath())})` }
      : { level: 'warn', label: 'Codex config not found' };
  } catch (err) {
    if (err instanceof ConfigParseError) return { level: 'fail', label: 'Codex config is invalid TOML' };
    return { level: 'fail', label: 'Codex config could not be read' };
  }
}

async function checkSessionsDir(): Promise<Check> {
  try {
    const s = await stat(codexSessionsDir());
    if (!s.isDirectory()) return { level: 'warn', label: 'Sessions path is not a directory' };
    return { level: 'pass', label: 'Sessions directory found' };
  } catch {
    return { level: 'warn', label: 'Sessions directory not found' };
  }
}

async function checkSessionReadable(): Promise<Check> {
  const sessions = await listSessions();
  const first = sessions[0];
  if (!first) return { level: 'warn', label: 'No session files found yet' };
  try {
    await access(first.filePath, constants.R_OK);
    return { level: 'pass', label: `Session files readable (${sessions.length} found)` };
  } catch {
    return { level: 'fail', label: 'Session files are not readable' };
  }
}

async function checkStatusLine(): Promise<Check> {
  try {
    const cfg = await readCodexConfig(codexConfigPath());
    if (cfg?.statusLine.kind === 'array') {
      return { level: 'pass', label: `Native statusline configured [${cfg.statusLine.items.join(', ')}]` };
    }
    return { level: 'warn', label: 'Native Codex statusline not configured — run `codex-hud setup`' };
  } catch {
    return { level: 'warn', label: 'Native Codex statusline state unknown' };
  }
}

function printDisclosure(): void {
  process.stdout.write('\nWhat codex-hud reads:\n');
  for (const r of DATA_DISCLOSURE.reads) process.stdout.write(`  • ${r}\n`);
  process.stdout.write('What codex-hud never reads:\n');
  for (const r of DATA_DISCLOSURE.neverReads) process.stdout.write(`  • ${r}\n`);
  process.stdout.write(`Network: ${DATA_DISCLOSURE.network}\n`);
}

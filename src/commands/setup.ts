import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { detectCodex } from '../core/codex.js';
import { readCodexConfig } from '../core/codexConfig.js';
import { readGitInfo } from '../core/git.js';
import { listSessions } from '../core/sessionReader.js';
import { backupFile, atomicWrite, fileExists } from '../core/backup.js';
import { planStatusLine, applyStatusLineEdit } from '../core/codexStatusline.js';
import { detectShell, installShellIntegration } from '../core/shellInit.js';
import { installPromptHook, hookCommand } from '../core/codexHooks.js';
import { codexConfigPath, codexSessionsDir, codexHooksPath, tildify } from '../core/paths.js';
import { readAppConfig, writeAppConfig } from '../config/appConfig.js';
import { ConfigParseError } from '../core/errors.js';
import type { StatusLineSetting } from '../types/codex.js';

export interface SetupFlags {
  dryRun?: boolean;
  yes?: boolean;
  statusline?: boolean; // --no-statusline => false
  shell?: boolean; // --no-shell => false
  hooks?: boolean; // --no-hooks => false
  mode?: 'basic' | 'dashboard';
}

export async function runSetup(flags: SetupFlags): Promise<number> {
  const wantStatusline = flags.statusline !== false;
  const wantShell = flags.shell !== false;
  const wantHooks = flags.hooks !== false;
  const shellTarget = detectShell();
  process.stdout.write('Codex HUD Setup\n\n');

  // 1. Detect environment
  const codex = await detectCodex();
  process.stdout.write(
    codex.found
      ? `  Codex CLI:        found (v${codex.version ?? 'unknown'})\n`
      : '  Codex CLI:        NOT FOUND — install Codex first, then re-run setup\n',
  );

  let config;
  try {
    config = await readCodexConfig(codexConfigPath());
  } catch (err) {
    if (err instanceof ConfigParseError) {
      process.stderr.write(`\n  Codex config at ${tildify(codexConfigPath())} is invalid TOML.\n`);
      process.stderr.write('  Fix or remove it, then re-run setup. No changes made.\n');
      return 1;
    }
    throw err;
  }

  const sessionsExist = await fileExists(codexSessionsDir());
  const sessions = await listSessions();
  const git = await readGitInfo(process.cwd());

  process.stdout.write(
    `  Codex config:     ${config ? `found (${tildify(codexConfigPath())})` : 'not found (a new one will be created)'}\n`,
  );
  process.stdout.write(
    `  Sessions:         ${sessionsExist ? `found (${sessions.length} session files)` : 'directory not found yet'}\n`,
  );
  process.stdout.write(`  Git repo here:    ${git.isRepo ? `yes (${git.branch ?? 'detached'})` : 'no'}\n\n`);

  // 2. Plan statusline change
  const currentSetting: StatusLineSetting = config?.statusLine ?? { kind: 'absent' };
  const plan = planStatusLine(currentSetting);

  process.stdout.write('  Files codex-hud will read: ~/.codex/config.toml, ~/.codex/sessions, git, codex --version\n');

  if (!wantStatusline) {
    process.stdout.write('  Native statusline: skipped (--no-statusline)\n');
  } else if (!plan.changed) {
    process.stdout.write('  Native statusline: already configured — no change needed\n');
  } else {
    const before = describeSetting(currentSetting);
    process.stdout.write('\n  Native statusline change (only the tui.status_line key):\n');
    process.stdout.write(`    before: ${before}\n`);
    process.stdout.write(`    after:  [${plan.proposed.map((i) => `"${i}"`).join(', ')}]\n`);
    process.stdout.write('  Your existing items are preserved; codex-hud only adds missing core items.\n');
  }

  if (wantHooks) {
    process.stdout.write(
      `\n  Prompt hook: add a UserPromptSubmit hook to ${tildify(codexHooksPath())}\n`,
    );
    process.stdout.write('  so the HUD appears above every prompt inside Codex (the recommended view).\n');
  }

  if (wantShell) {
    process.stdout.write(
      `\n  Shell integration (${shellTarget.shell}): add a 'codex' function to ${tildify(shellTarget.rcPath)}\n`,
    );
    process.stdout.write('  so typing `codex` shows the HUD once at startup too.\n');
  }

  if (flags.dryRun) {
    process.stdout.write('\n  --dry-run: no files were changed.\n');
    return 0;
  }

  // 3. Confirm
  const willEditConfig = wantStatusline && plan.changed;
  if ((willEditConfig || wantShell) && !flags.yes) {
    const ok = await confirm('\n  Apply these changes (statusline, shell function, codex-hud config)?');
    if (!ok) {
      process.stdout.write('  Aborted. No changes made.\n');
      return 0;
    }
  }

  // 4. Apply statusline (backup-first, atomic)
  const appConfig = await readAppConfig();
  if (willEditConfig) {
    try {
      const original = config ? await readFile(codexConfigPath(), 'utf8') : '';
      let backupPath: string | undefined;
      if (config) backupPath = await backupFile(codexConfigPath());
      const updated = applyStatusLineEdit(original, plan.proposed);
      await atomicWrite(codexConfigPath(), updated);

      appConfig.statusLineBackup = {
        backupPath: backupPath ?? '(none — config did not exist)',
        priorItems: currentSetting.kind === 'array' ? currentSetting.items : null,
        appliedAt: new Date().toISOString(),
      };
      process.stdout.write(
        `\n  Statusline updated.${backupPath ? ` Backup: ${tildify(backupPath)}` : ''}\n`,
      );
    } catch (err) {
      process.stderr.write(`\n  Failed to update statusline: ${(err as Error).message}\n`);
      process.stderr.write('  No partial changes were written (atomic write + backup).\n');
      return 1;
    }
  }

  // 5. Write codex-hud config
  await writeAppConfig(appConfig);
  process.stdout.write('  codex-hud config saved.\n');

  // 5b. Install per-prompt hook
  let hookInstalled = false;
  if (wantHooks) {
    try {
      await installPromptHook(hookCommand(true));
      hookInstalled = true;
      process.stdout.write(`  Prompt hook added to ${tildify(codexHooksPath())}.\n`);
    } catch (err) {
      process.stderr.write(`  Could not install prompt hook: ${(err as Error).message}\n`);
    }
  }

  // 6. Install shell integration
  let shellInstalled = false;
  if (wantShell) {
    try {
      const result = await installShellIntegration(shellTarget);
      shellInstalled = true;
      process.stdout.write(
        result === 'installed'
          ? `  Shell function added to ${tildify(shellTarget.rcPath)}.\n`
          : `  Shell function already present in ${tildify(shellTarget.rcPath)}.\n`,
      );
    } catch (err) {
      process.stderr.write(`  Could not update ${tildify(shellTarget.rcPath)}: ${(err as Error).message}\n`);
    }
  }

  // 7. Next step
  process.stdout.write('\n  Setup complete.\n');
  if (hookInstalled) {
    process.stdout.write('\n  The HUD will appear above every prompt inside Codex.\n');
    process.stdout.write('  Restart Codex (or start a new session) for the hook to load.\n');
  }
  if (shellInstalled) {
    process.stdout.write(
      `\n  Reload your shell so 'codex' also shows the HUD at startup:\n\n      source ${tildify(shellTarget.rcPath)}\n`,
    );
  }
  process.stdout.write('\n  Then just run:\n\n      codex\n\n');
  process.stdout.write('  For a separate live dashboard:  codex-hud watch\n\n');
  return 0;
}

function describeSetting(setting: StatusLineSetting): string {
  switch (setting.kind) {
    case 'array':
      return `[${setting.items.map((i) => `"${i}"`).join(', ')}]`;
    case 'disabled':
      return 'null (disabled)';
    case 'absent':
      return '(not set)';
  }
}

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
}

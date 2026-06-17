import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { backupFile, atomicWrite, fileExists } from './backup.js';

export type SupportedShell = 'zsh' | 'bash' | 'fish';

const BEGIN = '# >>> codex-hud >>>';
const END = '# <<< codex-hud <<<';

export interface ShellTarget {
  shell: SupportedShell;
  rcPath: string;
}

/** Detects the user's shell and the rc file to edit from $SHELL. */
export function detectShell(shellPath = process.env.SHELL ?? ''): ShellTarget {
  if (shellPath.includes('fish')) {
    return { shell: 'fish', rcPath: join(homedir(), '.config', 'fish', 'config.fish') };
  }
  if (shellPath.includes('bash')) {
    return { shell: 'bash', rcPath: join(homedir(), '.bashrc') };
  }
  return { shell: 'zsh', rcPath: join(homedir(), '.zshrc') };
}

/**
 * The `codex` shell function that prints the colorized HUD, then launches the
 * real Codex CLI. `command codex` bypasses this function to reach the binary.
 */
export function shellFunctionBlock(shell: SupportedShell): string {
  if (shell === 'fish') {
    return [
      BEGIN,
      'function codex',
      '    codex-hud status',
      '    command codex $argv',
      'end',
      END,
    ].join('\n');
  }
  return [
    BEGIN,
    'codex() {',
    '  codex-hud status',
    '  command codex "$@"',
    '}',
    END,
  ].join('\n');
}

export type ShellInstallResult = 'installed' | 'already-installed';

/**
 * Installs the codex shell function into the rc file, backup-first and
 * idempotently (a guarded block keyed by markers). Returns whether it changed.
 */
export async function installShellIntegration(target: ShellTarget): Promise<ShellInstallResult> {
  const existing = (await fileExists(target.rcPath)) ? await readFile(target.rcPath, 'utf8') : '';
  if (existing.includes(BEGIN)) return 'already-installed';

  if (existing.length > 0) await backupFile(target.rcPath);

  const block = shellFunctionBlock(target.shell);
  const sep = existing.length === 0 || existing.endsWith('\n') ? '' : '\n';
  await atomicWrite(target.rcPath, `${existing}${sep}\n${block}\n`);
  return 'installed';
}

/** Removes the guarded codex-hud block from the rc file (backup-first). */
export async function uninstallShellIntegration(target: ShellTarget): Promise<boolean> {
  if (!(await fileExists(target.rcPath))) return false;
  const existing = await readFile(target.rcPath, 'utf8');
  if (!existing.includes(BEGIN)) return false;

  await backupFile(target.rcPath);
  const cleaned = removeBlock(existing);
  await atomicWrite(target.rcPath, cleaned);
  return true;
}

export function removeBlock(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    if (line.trim() === BEGIN) {
      skipping = true;
      continue;
    }
    if (line.trim() === END) {
      skipping = false;
      continue;
    }
    if (!skipping) out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

import { readFile } from 'node:fs/promises';
import { backupFile, atomicWrite, fileExists } from './backup.js';
import { codexHooksPath } from './paths.js';

/** Marker substring that identifies a codex-hud hook command. */
const HOOK_MARKER = 'codex-hud hook';

interface CommandHook {
  type: string;
  command: string;
  timeout?: number;
  statusMessage?: string;
}
interface HookGroup {
  hooks: CommandHook[];
}
interface HooksFile {
  hooks?: Record<string, HookGroup[]>;
  [key: string]: unknown;
}

export function hookCommand(color: boolean): string {
  return color ? `${HOOK_MARKER}` : `${HOOK_MARKER} --no-color`;
}

function buildGroup(command: string): HookGroup {
  return {
    hooks: [{ type: 'command', command, timeout: 10, statusMessage: 'codex-hud' }],
  };
}

async function readHooksFile(path: string): Promise<HooksFile> {
  if (!(await fileExists(path))) return {};
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8'));
    return typeof parsed === 'object' && parsed !== null ? (parsed as HooksFile) : {};
  } catch {
    // Preserve nothing we can't parse; caller backs up first regardless.
    return {};
  }
}

function groupHasMarker(group: HookGroup): boolean {
  return (group.hooks ?? []).some((h) => typeof h.command === 'string' && h.command.includes(HOOK_MARKER));
}

export type HookInstallResult = 'installed' | 'already-installed';

/**
 * Installs (or updates) the codex-hud UserPromptSubmit hook in hooks.json,
 * merging with any existing hooks. Backup-first and idempotent.
 */
export async function installPromptHook(
  command: string,
  path = codexHooksPath(),
): Promise<HookInstallResult> {
  const existed = await fileExists(path);
  const file = await readHooksFile(path);
  file.hooks ??= {};
  const groups = (file.hooks.UserPromptSubmit ??= []);

  const ours = groups.find(groupHasMarker);
  if (ours) {
    // Refresh the command (e.g. color flag changed) but report idempotently.
    const first = ours.hooks[0];
    if (first && first.command === command) return 'already-installed';
    ours.hooks = [{ type: 'command', command, timeout: 10, statusMessage: 'codex-hud' }];
  } else {
    groups.push(buildGroup(command));
  }

  if (existed) await backupFile(path);
  await atomicWrite(path, JSON.stringify(file, null, 2) + '\n');
  return 'installed';
}

/** Removes codex-hud hook groups from hooks.json (backup-first). */
export async function uninstallPromptHook(path = codexHooksPath()): Promise<boolean> {
  if (!(await fileExists(path))) return false;
  const file = await readHooksFile(path);
  const groups = file.hooks?.UserPromptSubmit;
  if (!groups || !groups.some(groupHasMarker)) return false;

  const remaining = groups.filter((g) => !groupHasMarker(g));
  if (remaining.length > 0) {
    file.hooks!.UserPromptSubmit = remaining;
  } else {
    delete file.hooks!.UserPromptSubmit;
    if (Object.keys(file.hooks!).length === 0) delete file.hooks;
  }

  await backupFile(path);
  await atomicWrite(path, JSON.stringify(file, null, 2) + '\n');
  return true;
}

export async function isPromptHookInstalled(path = codexHooksPath()): Promise<boolean> {
  const file = await readHooksFile(path);
  return (file.hooks?.UserPromptSubmit ?? []).some(groupHasMarker);
}

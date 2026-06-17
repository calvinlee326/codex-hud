import { execa } from 'execa';
import type { GitInfo } from '../types/app.js';

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execa('git', args, { cwd, timeout: 5000 });
  return stdout.trim();
}

/**
 * Reads git metadata for `cwd`. Never throws; a non-repo or missing git yields
 * `{ isRepo: false, dirty: false }`.
 */
export async function readGitInfo(cwd: string): Promise<GitInfo> {
  try {
    const inside = await git(cwd, ['rev-parse', '--is-inside-work-tree']);
    if (inside !== 'true') return { isRepo: false, dirty: false };
  } catch {
    return { isRepo: false, dirty: false };
  }

  const info: GitInfo = { isRepo: true, dirty: false };

  try {
    info.branch = (await git(cwd, ['branch', '--show-current'])) || undefined;
  } catch {
    /* detached HEAD or error — leave undefined */
  }

  try {
    const status = await git(cwd, ['status', '--porcelain']);
    info.dirty = status.length > 0;
  } catch {
    /* leave dirty=false */
  }

  try {
    const counts = await git(cwd, ['rev-list', '--left-right', '--count', '@{u}...HEAD']);
    const [behind, ahead] = counts.split(/\s+/).map((n) => Number.parseInt(n, 10));
    if (Number.isFinite(behind)) info.behind = behind;
    if (Number.isFinite(ahead)) info.ahead = ahead;
  } catch {
    /* no upstream — leave ahead/behind undefined */
  }

  return info;
}

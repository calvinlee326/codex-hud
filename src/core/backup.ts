import { readFile, writeFile, rename, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { BackupError } from './errors.js';

/**
 * Creates a timestamped, never-clobbered backup of `filePath` alongside it and
 * verifies it byte-for-byte. Returns the backup path. Throws BackupError on
 * any failure so callers abort before editing the original.
 */
export async function backupFile(filePath: string): Promise<string> {
  let original: Buffer;
  try {
    original = await readFile(filePath);
  } catch (err) {
    throw new BackupError(`Cannot read ${filePath} for backup`, { cause: err });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = join(dirname(filePath), `${basename(filePath)}.codex-hud.bak-${stamp}`);

  try {
    await writeFile(backupPath, original, { flag: 'wx' });
  } catch (err) {
    throw new BackupError(`Cannot write backup ${backupPath}`, { cause: err });
  }

  const verify = await readFile(backupPath);
  if (!verify.equals(original)) {
    throw new BackupError(`Backup verification failed for ${backupPath}`);
  }
  return backupPath;
}

/**
 * Atomically writes `content` to `filePath` (temp file + rename) so a failure
 * never leaves a partially written config.
 */
export async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tmp = `${filePath}.codex-hud.tmp-${process.pid}`;
  await writeFile(tmp, content, 'utf8');
  await rename(tmp, filePath);
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

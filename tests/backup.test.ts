import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backupFile, atomicWrite } from '../src/core/backup.js';
import { BackupError } from '../src/core/errors.js';

const dirs: string[] = [];
async function tmpDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'codex-hud-bak-'));
  dirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe('backupFile', () => {
  it('creates a verified timestamped backup', async () => {
    const dir = await tmpDir();
    const file = join(dir, 'config.toml');
    await writeFile(file, 'model = "x"\n', 'utf8');

    const backupPath = await backupFile(file);
    expect(backupPath).toContain('config.toml.codex-hud.bak-');
    expect(await readFile(backupPath, 'utf8')).toBe('model = "x"\n');
  });

  it('does not clobber an existing backup', async () => {
    const dir = await tmpDir();
    const file = join(dir, 'config.toml');
    await writeFile(file, 'a\n', 'utf8');
    const first = await backupFile(file);
    await writeFile(file, 'b\n', 'utf8');
    const second = await backupFile(file);
    expect(first).not.toBe(second);
    const backups = (await readdir(dir)).filter((f) => f.includes('.bak-'));
    expect(backups.length).toBe(2);
  });

  it('throws BackupError when the source is missing', async () => {
    await expect(backupFile('/no/such/file.toml')).rejects.toBeInstanceOf(BackupError);
  });
});

describe('atomicWrite', () => {
  it('writes content and leaves no temp file', async () => {
    const dir = await tmpDir();
    const file = join(dir, 'out.toml');
    await atomicWrite(file, 'hello\n');
    expect(await readFile(file, 'utf8')).toBe('hello\n');
    const leftovers = (await readdir(dir)).filter((f) => f.includes('.tmp-'));
    expect(leftovers.length).toBe(0);
  });
});

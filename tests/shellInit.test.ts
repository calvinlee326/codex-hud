import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  detectShell,
  shellFunctionBlock,
  installShellIntegration,
  uninstallShellIntegration,
  removeBlock,
} from '../src/core/shellInit.js';

const dirs: string[] = [];
async function tmpRc(content: string): Promise<{ dir: string; rcPath: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'codex-hud-shell-'));
  dirs.push(dir);
  const rcPath = join(dir, '.zshrc');
  await writeFile(rcPath, content, 'utf8');
  return { dir, rcPath };
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe('detectShell', () => {
  it('maps $SHELL to a shell and rc path', () => {
    expect(detectShell('/bin/zsh').shell).toBe('zsh');
    expect(detectShell('/usr/bin/bash').shell).toBe('bash');
    expect(detectShell('/opt/homebrew/bin/fish').shell).toBe('fish');
  });
});

describe('shellFunctionBlock', () => {
  it('uses POSIX function syntax for zsh/bash', () => {
    const block = shellFunctionBlock('zsh');
    expect(block).toContain('codex() {');
    expect(block).toContain('codex-hud status');
    expect(block).toContain('command codex "$@"');
  });

  it('uses fish syntax for fish', () => {
    const block = shellFunctionBlock('fish');
    expect(block).toContain('function codex');
    expect(block).toContain('command codex $argv');
    expect(block).toContain('end');
  });
});

describe('installShellIntegration', () => {
  it('appends the block, preserves prior content, and backs up', async () => {
    const { dir, rcPath } = await tmpRc('export FOO=bar\n');
    const result = await installShellIntegration({ shell: 'zsh', rcPath });
    expect(result).toBe('installed');

    const after = await readFile(rcPath, 'utf8');
    expect(after).toContain('export FOO=bar');
    expect(after).toContain('codex() {');

    const backups = (await readdir(dir)).filter((f) => f.includes('.bak-'));
    expect(backups.length).toBe(1);
  });

  it('is idempotent', async () => {
    const { rcPath } = await tmpRc('');
    await installShellIntegration({ shell: 'zsh', rcPath });
    const second = await installShellIntegration({ shell: 'zsh', rcPath });
    expect(second).toBe('already-installed');
  });

  it('uninstall removes the block but keeps other lines', async () => {
    const { rcPath } = await tmpRc('export FOO=bar\n');
    await installShellIntegration({ shell: 'zsh', rcPath });
    const removed = await uninstallShellIntegration({ shell: 'zsh', rcPath });
    expect(removed).toBe(true);

    const after = await readFile(rcPath, 'utf8');
    expect(after).toContain('export FOO=bar');
    expect(after).not.toContain('codex() {');
  });
});

describe('removeBlock', () => {
  it('strips the guarded region', () => {
    const text = 'a\n# >>> codex-hud >>>\ncodex() {}\n# <<< codex-hud <<<\nb\n';
    expect(removeBlock(text)).toBe('a\nb\n');
  });
});

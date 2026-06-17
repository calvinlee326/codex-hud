import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execa } from 'execa';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readGitInfo } from '../src/core/git.js';

describe('readGitInfo', () => {
  let repo: string;
  let plain: string;

  beforeAll(async () => {
    repo = await mkdtemp(join(tmpdir(), 'codex-hud-git-'));
    await execa('git', ['init', '-b', 'main'], { cwd: repo });
    await execa('git', ['config', 'user.email', 't@t.dev'], { cwd: repo });
    await execa('git', ['config', 'user.name', 'Test'], { cwd: repo });
    await writeFile(join(repo, 'a.txt'), 'hello', 'utf8');
    await execa('git', ['add', '.'], { cwd: repo });
    await execa('git', ['commit', '-m', 'init'], { cwd: repo });

    plain = await mkdtemp(join(tmpdir(), 'codex-hud-plain-'));
  });

  afterAll(async () => {
    await rm(repo, { recursive: true, force: true });
    await rm(plain, { recursive: true, force: true });
  });

  it('reports branch and clean state', async () => {
    const info = await readGitInfo(repo);
    expect(info.isRepo).toBe(true);
    expect(info.branch).toBe('main');
    expect(info.dirty).toBe(false);
  });

  it('detects a dirty working tree', async () => {
    await writeFile(join(repo, 'b.txt'), 'new', 'utf8');
    const info = await readGitInfo(repo);
    expect(info.dirty).toBe(true);
  });

  it('returns isRepo=false outside a repo', async () => {
    const info = await readGitInfo(plain);
    expect(info.isRepo).toBe(false);
    expect(info.dirty).toBe(false);
  });
});

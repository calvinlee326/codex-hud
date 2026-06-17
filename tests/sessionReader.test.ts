import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listSessions, selectSession } from '../src/core/sessionReader.js';

const dirs: string[] = [];

async function makeSessionsDir(
  files: Array<{ rel: string; cwd?: string }>,
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'codex-hud-reader-'));
  dirs.push(root);
  for (const f of files) {
    const full = join(root, f.rel);
    await mkdir(join(full, '..'), { recursive: true });
    const meta = JSON.stringify({
      timestamp: '2026-06-16T00:00:00.000Z',
      type: 'session_meta',
      payload: { id: f.rel, cwd: f.cwd ?? '/somewhere/else' },
    });
    await writeFile(full, meta + '\n', 'utf8');
  }
  return root;
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe('sessionReader', () => {
  it('lists sessions newest-first by filename', async () => {
    const root = await makeSessionsDir([
      { rel: '2026/06/16/rollout-2026-06-16T08-00-00-a.jsonl' },
      { rel: '2026/06/16/rollout-2026-06-16T09-00-00-b.jsonl' },
    ]);
    const list = await listSessions(root);
    expect(list[0]?.filePath).toContain('T09-00-00');
  });

  it('prefers a session whose cwd matches the project', async () => {
    const root = await makeSessionsDir([
      { rel: '2026/06/16/rollout-2026-06-16T09-00-00-newer.jsonl', cwd: '/other' },
      { rel: '2026/06/16/rollout-2026-06-16T08-00-00-match.jsonl', cwd: '/home/u/proj' },
    ]);
    const selected = await selectSession('/home/u/proj', root);
    expect(selected).toContain('match');
  });

  it('falls back to the newest session when no cwd matches', async () => {
    const root = await makeSessionsDir([
      { rel: '2026/06/16/rollout-2026-06-16T08-00-00-a.jsonl', cwd: '/x' },
      { rel: '2026/06/16/rollout-2026-06-16T09-00-00-b.jsonl', cwd: '/y' },
    ]);
    const selected = await selectSession('/home/u/proj', root);
    expect(selected).toContain('T09-00-00');
  });

  it('returns undefined when there are no sessions', async () => {
    const root = await makeSessionsDir([]);
    expect(await selectSession('/home/u/proj', root)).toBeUndefined();
  });
});

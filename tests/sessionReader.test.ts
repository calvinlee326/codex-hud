import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listSessions, selectSession, findRecentUsage } from '../src/core/sessionReader.js';

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

describe('findRecentUsage', () => {
  it('returns rate limits and token usage from a recent session that has them', async () => {
    const root = await mkdtemp(join(tmpdir(), 'codex-hud-rl-'));
    dirs.push(root);
    const dir = join(root, '2026/06/16');
    await mkdir(dir, { recursive: true });
    const lines = [
      JSON.stringify({ timestamp: '2026-06-16T00:00:00.000Z', type: 'session_meta', payload: { cwd: '/x' } }),
      JSON.stringify({
        timestamp: '2026-06-16T00:01:00.000Z',
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: { last_token_usage: { input_tokens: 10, total_tokens: 12 } },
          rate_limits: { primary: { used_percent: 42, resets_at: 1767840127 } },
        },
      }),
    ];
    await writeFile(join(dir, 'rollout-2026-06-16T09-00-00-a.jsonl'), lines.join('\n') + '\n', 'utf8');

    const usage = await findRecentUsage(root);
    expect(usage.rateLimits?.primary?.usedPercent).toBe(42);
    expect(usage.latestTokenUsage?.total).toBe(12);
  });

  it('returns empty object when no session has usage data', async () => {
    const root = await makeSessionsDir([{ rel: '2026/06/16/rollout-2026-06-16T09-00-00-a.jsonl' }]);
    expect(await findRecentUsage(root)).toEqual({});
  });
});

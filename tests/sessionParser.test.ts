import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseSession, peekSessionCwd } from '../src/core/sessionParser.js';

const SECRET = 'SUPER_SECRET_PROMPT_BODY';

// Mirrors the real Codex rollout shape: {timestamp, type, payload}.
const LINES = [
  {
    timestamp: '2026-06-16T21:00:00.000Z',
    type: 'session_meta',
    payload: { id: 'abc', cwd: '/home/u/proj', cli_version: '0.140.0', model_provider: 'openai' },
  },
  {
    timestamp: '2026-06-16T21:00:01.000Z',
    type: 'turn_context',
    payload: { model: 'gpt-5.5', effort: 'high' },
  },
  {
    timestamp: '2026-06-16T21:00:02.000Z',
    type: 'event_msg',
    payload: { type: 'user_message', message: SECRET },
  },
  {
    timestamp: '2026-06-16T21:00:03.000Z',
    type: 'response_item',
    payload: { type: 'function_call', name: 'shell', arguments: SECRET, call_id: '1' },
  },
  {
    timestamp: '2026-06-16T21:00:04.000Z',
    type: 'response_item',
    payload: { type: 'function_call', name: 'shell', call_id: '2' },
  },
  {
    timestamp: '2026-06-16T21:00:05.000Z',
    type: 'response_item',
    payload: { type: 'function_call_output', call_id: '1', output: SECRET },
  },
  {
    timestamp: '2026-06-16T21:00:06.000Z',
    type: 'event_msg',
    payload: { type: 'agent_message', message: SECRET },
  },
  {
    timestamp: '2026-06-16T21:05:00.000Z',
    type: 'event_msg',
    payload: {
      type: 'token_count',
      info: {
        total_token_usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
        model_context_window: 1000,
      },
    },
  },
];

const dirs: string[] = [];
async function writeJsonl(lines: unknown[], extra = ''): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'codex-hud-sess-'));
  dirs.push(dir);
  const path = join(dir, 'rollout.jsonl');
  await writeFile(path, lines.map((l) => JSON.stringify(l)).join('\n') + '\n' + extra, 'utf8');
  return path;
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe('parseSession', () => {
  it('aggregates metadata, counts, tools, tokens and duration', async () => {
    const path = await writeJsonl(LINES);
    const s = await parseSession(path);

    expect(s.meta?.cwd).toBe('/home/u/proj');
    expect(s.model).toBe('gpt-5.5');
    expect(s.reasoningEffort).toBe('high');
    expect(s.userMessageCount).toBe(1);
    expect(s.agentMessageCount).toBe(1);
    expect(s.toolCounts).toEqual([{ name: 'shell', count: 2 }]);
    expect(s.latestTokenUsage?.total).toBe(150);
    expect(s.modelContextWindow).toBe(1000);
    expect(s.durationMs).toBe(5 * 60 * 1000);
  });

  it('never retains message bodies in its output (privacy)', async () => {
    const path = await writeJsonl(LINES);
    const s = await parseSession(path);
    expect(JSON.stringify(s)).not.toContain(SECRET);
  });

  it('skips malformed lines and counts them', async () => {
    const path = await writeJsonl(LINES, 'not json at all\n{bad json\n');
    const s = await parseSession(path);
    expect(s.malformedLines).toBe(2);
    expect(s.userMessageCount).toBe(1);
  });

  it('ignores unknown item types', async () => {
    const path = await writeJsonl([
      { timestamp: '2026-06-16T21:00:00.000Z', type: 'mystery_future_type', payload: { x: 1 } },
    ]);
    const s = await parseSession(path);
    expect(s.linesRead).toBe(1);
    expect(s.malformedLines).toBe(0);
  });

  it('flags truncation when over the line cap', async () => {
    const path = await writeJsonl(LINES);
    const s = await parseSession(path, { maxLines: 2 });
    expect(s.truncated).toBe(true);
  });
});

describe('peekSessionCwd', () => {
  it('returns the cwd from session_meta', async () => {
    const path = await writeJsonl(LINES);
    expect(await peekSessionCwd(path)).toBe('/home/u/proj');
  });
});

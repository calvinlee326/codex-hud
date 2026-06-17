import { describe, it, expect } from 'vitest';
import { formatDuration, formatPercent, truncate, orUnknown, orNa, renderRows } from '../src/tui/format.js';
import { progressBar } from '../src/tui/bars.js';
import { renderSnapshot } from '../src/tui/renderer.js';
import type { HudSnapshot } from '../src/types/app.js';

describe('format', () => {
  it('formats durations', () => {
    expect(formatDuration(undefined)).toBe('n/a');
    expect(formatDuration(42 * 60_000)).toBe('42m');
    expect(formatDuration(90 * 60_000)).toBe('1h 30m');
  });

  it('labels percentages as estimates', () => {
    expect(formatPercent(undefined)).toBe('est. n/a');
    expect(formatPercent(0.305)).toBe('est. 31%');
  });

  it('truncates with an ellipsis', () => {
    expect(truncate('hello', 10)).toBe('hello');
    expect(truncate('hello world', 5)).toBe('hell…');
  });

  it('provides fallbacks', () => {
    expect(orUnknown(undefined)).toBe('unknown');
    expect(orNa('')).toBe('n/a');
    expect(orNa('x')).toBe('x');
  });

  it('renders aligned rows', () => {
    expect(renderRows([['A', '1'], ['BB', '2']], 4)).toBe('A   1\nBB  2');
  });
});

describe('progressBar', () => {
  it('renders an empty bar for unknown', () => {
    expect(progressBar(undefined, 4)).toBe('[────]');
  });
  it('fills proportionally and clamps', () => {
    expect(progressBar(0.5, 4)).toBe('[██──]');
    expect(progressBar(2, 4)).toBe('[████]');
  });
});

function baseSnapshot(overrides: Partial<HudSnapshot> = {}): HudSnapshot {
  return {
    codex: { found: true, version: '0.140.0' },
    project: { path: '/p/proj', name: 'proj', git: { isRepo: true, branch: 'main', dirty: true } },
    session: {
      filePath: '/s.jsonl',
      model: 'gpt-5.5',
      reasoningEffort: 'high',
      userMessageCount: 1,
      agentMessageCount: 2,
      toolCounts: [{ name: 'shell', count: 3 }],
      turnCount: 1,
      durationMs: 42 * 60_000,
      modelContextWindow: 1000,
      latestTokenUsage: { total: 300 },
      linesRead: 10,
      malformedLines: 0,
      truncated: false,
    },
    generatedAt: new Date('2026-06-16T00:00:00Z'),
    ...overrides,
  };
}

describe('renderSnapshot', () => {
  it('renders all rows with a dirty git marker and estimated context', () => {
    const out = renderSnapshot(baseSnapshot());
    expect(out).toContain('Codex     v0.140.0');
    expect(out).toContain('main *');
    expect(out).toContain('gpt-5.5');
    expect(out).toContain('shell x3');
    expect(out).toContain('Duration  42m');
    expect(out).toContain('est. 30%');
    expect(out).toContain('local-only');
  });

  it('degrades gracefully with no session and no repo', () => {
    const out = renderSnapshot(
      baseSnapshot({
        session: undefined,
        project: { path: '/p', name: 'p', git: { isRepo: false, dirty: false } },
        codex: { found: false },
      }),
    );
    expect(out).toContain('Codex     not found');
    expect(out).toContain('not a repo');
    expect(out).toContain('no session found');
  });
});

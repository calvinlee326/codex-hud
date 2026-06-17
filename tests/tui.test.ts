import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  formatPercent,
  formatResetIn,
  truncate,
  orUnknown,
  orNa,
  renderRows,
} from '../src/tui/format.js';
import { bar, severityColor } from '../src/tui/bars.js';
import { createPalette } from '../src/tui/colors.js';
import { renderSnapshot } from '../src/tui/renderer.js';
import type { HudSnapshot } from '../src/types/app.js';

const plain = createPalette(false);

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

  it('formats reset times', () => {
    const now = new Date('2026-06-16T00:00:00Z');
    expect(formatResetIn(undefined, now)).toBeUndefined();
    expect(formatResetIn(new Date('2026-06-16T03:27:00Z'), now)).toBe('resets in 3h 27m');
    expect(formatResetIn(new Date('2026-06-22T12:00:00Z'), now)).toBe('resets in 6d 12h');
    expect(formatResetIn(new Date('2026-06-16T00:45:00Z'), now)).toBe('resets in 45m');
  });
});

describe('bar', () => {
  it('renders a dim empty bar for unknown', () => {
    expect(bar(undefined, plain, 'green', 4)).toBe('▱▱▱▱');
  });
  it('fills proportionally and clamps', () => {
    expect(bar(0.5, plain, 'green', 4)).toBe('▰▰▱▱');
    expect(bar(2, plain, 'green', 4)).toBe('▰▰▰▰');
  });
  it('escalates severity color with usage', () => {
    expect(severityColor(0.3)).toBe('green');
    expect(severityColor(0.75)).toBe('yellow');
    expect(severityColor(0.95)).toBe('red');
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
      rateLimits: {
        primary: { usedPercent: 30, resetsAt: new Date(Date.now() + 3 * 3600_000) },
        secondary: { usedPercent: 6, resetsAt: new Date(Date.now() + 6 * 86400_000) },
      },
      linesRead: 10,
      malformedLines: 0,
      truncated: false,
    },
    generatedAt: new Date('2026-06-16T00:00:00Z'),
    ...overrides,
  };
}

describe('renderSnapshot', () => {
  it('renders the compact HUD with model, git, context, usage and tools', () => {
    const out = renderSnapshot(baseSnapshot(), { color: false });
    expect(out).toContain('[gpt-5.5 | high]');
    expect(out).toContain('proj git:(main)*');
    expect(out).toContain('⏱ 42m');
    expect(out).toContain('Context');
    expect(out).toContain('30%');
    expect(out).toContain('Usage');
    expect(out).toContain('Weekly');
    expect(out).toContain('✓ shell ×3');
    expect(out).toContain('local-only · no credentials read');
  });

  it('emits ANSI codes when color is enabled', () => {
    const out = renderSnapshot(baseSnapshot(), { color: true });
    expect(out).toContain('\x1b[');
  });

  it('degrades gracefully with no session and no repo', () => {
    const out = renderSnapshot(
      baseSnapshot({
        session: undefined,
        project: { path: '/p', name: 'p', git: { isRepo: false, dirty: false } },
        codex: { found: false },
      }),
      { color: false },
    );
    expect(out).toContain('codex not found');
    expect(out).toContain('no session found');
  });
});

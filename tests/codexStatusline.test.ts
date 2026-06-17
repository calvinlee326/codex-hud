import { describe, it, expect } from 'vitest';
import { planStatusLine, applyStatusLineEdit } from '../src/core/codexStatusline.js';

describe('planStatusLine', () => {
  it('adds core items when none are set', () => {
    const plan = planStatusLine({ kind: 'absent' });
    expect(plan.changed).toBe(true);
    expect(plan.proposed).toEqual(['model', 'context_usage', 'cwd']);
  });

  it('preserves unknown items and only appends missing core items', () => {
    const plan = planStatusLine({ kind: 'array', items: ['some_future_item', 'model'] });
    expect(plan.proposed).toEqual(['some_future_item', 'model', 'context_usage', 'cwd']);
    expect(plan.changed).toBe(true);
  });

  it('reports no change when core items are already present', () => {
    const plan = planStatusLine({ kind: 'array', items: ['model', 'context_usage', 'cwd'] });
    expect(plan.changed).toBe(false);
  });
});

describe('applyStatusLineEdit', () => {
  it('replaces an existing dotted assignment in place, preserving comments', () => {
    const input = '# my config\nmodel = "gpt-5.5"\ntui.status_line = ["model"]\n';
    const out = applyStatusLineEdit(input, ['model', 'cwd']);
    expect(out).toContain('# my config');
    expect(out).toContain('model = "gpt-5.5"');
    expect(out).toContain('tui.status_line = ["model", "cwd"]');
    expect(out).not.toContain('["model"]\n');
  });

  it('inserts into an existing [tui] table', () => {
    const input = '[tui]\ntheme = "dark"\n';
    const out = applyStatusLineEdit(input, ['model']);
    expect(out).toContain('[tui]\nstatus_line = ["model"]');
    expect(out).toContain('theme = "dark"');
  });

  it('appends a dotted key when nothing exists', () => {
    const out = applyStatusLineEdit('model = "x"\n', ['model']);
    expect(out).toBe('model = "x"\ntui.status_line = ["model"]\n');
  });
});

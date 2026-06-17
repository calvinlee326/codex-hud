import type { HudSnapshot, AppConfig } from '../types/app.js';
import type { RateWindow } from '../types/session.js';
import { estimateContextUsage } from '../core/contextWindow.js';
import { formatDuration, formatResetIn, orUnknown, truncate } from './format.js';
import { bar, severityColor } from './bars.js';
import { createPalette, colorEnabled, type Palette } from './colors.js';

export interface RenderOptions {
  config?: AppConfig;
  color?: boolean;
  /** Footer line appended in watch mode. */
  footer?: string;
}

const SEP = '  ';

function pct(fraction: number | undefined): string {
  return fraction === undefined ? 'n/a' : `${Math.round(fraction * 100)}%`;
}

function modelSegment(s: HudSnapshot, p: Palette): string {
  const model = orUnknown(s.session?.model ?? s.config?.model);
  const effort = s.session?.reasoningEffort ?? s.config?.modelReasoningEffort;
  const inner = effort ? `${model} | ${effort}` : model;
  return p.paint(`[${inner}]`, 'cyan', 'bold');
}

function dirSegment(s: HudSnapshot, p: Palette): string {
  const dir = p.paint(truncate(s.project.name, 30), 'cyan');
  const git = s.project.git;
  if (!git.isRepo) return dir;
  const branch = orUnknown(git.branch);
  const dirty = git.dirty ? p.paint('*', 'yellow') : '';
  return `${dir} ${p.paint('git:', 'dim')}${p.paint(`(${branch})`, 'magenta')}${dirty}`;
}

function headerLine(s: HudSnapshot, p: Palette): string {
  const parts = [modelSegment(s, p), dirSegment(s, p)];
  if (!s.codex.found) parts.push(p.paint('codex not found', 'red'));
  if (s.session?.durationMs !== undefined) {
    parts.push(p.paint(`⏱ ${formatDuration(s.session.durationMs)}`, 'dim'));
  }
  return parts.join(p.paint(' | ', 'dim'));
}

function usageSegment(label: string, w: RateWindow | undefined, p: Palette): string | undefined {
  if (!w) return undefined;
  const frac = w.usedPercent / 100;
  const color = severityColor(frac);
  const reset = formatResetIn(w.resetsAt);
  const resetStr = reset ? p.paint(` (${reset})`, 'dim') : '';
  return `${p.paint(label, 'dim')} ${bar(frac, p, color)} ${Math.round(w.usedPercent)}%${resetStr}`;
}

function meterLine(s: HudSnapshot, p: Palette): string | undefined {
  const segments: string[] = [];
  const model = s.session?.model ?? s.config?.model;
  const ctx = estimateContextUsage(
    s.session?.latestTokenUsage,
    model,
    s.session?.modelContextWindow,
  );
  if (ctx !== undefined) {
    segments.push(`${p.paint('Context', 'dim')} ${bar(ctx, p, severityColor(ctx))} ${pct(ctx)}`);
  }
  const limits = s.session?.rateLimits;
  const primary = usageSegment('Usage', limits?.primary, p);
  const weekly = usageSegment('Weekly', limits?.secondary, p);
  if (primary) segments.push(primary);
  if (weekly) segments.push(weekly);

  return segments.length > 0 ? segments.join(p.paint(' | ', 'dim')) : undefined;
}

function toolsLine(s: HudSnapshot, p: Palette): string | undefined {
  const tools = s.session?.toolCounts ?? [];
  if (tools.length === 0) return undefined;
  return tools
    .slice(0, 6)
    .map((t) => `${p.paint('✓', 'green')} ${t.name} ${p.paint(`×${t.count}`, 'dim')}`)
    .join(SEP);
}

function footerLine(s: HudSnapshot, p: Palette): string {
  const bits: string[] = [];
  if (s.session) {
    bits.push(`${s.session.userMessageCount + s.session.agentMessageCount} msgs`);
    if (s.session.turnCount > 0) bits.push(`${s.session.turnCount} turns`);
  } else {
    bits.push('no session found');
  }
  bits.push('local-only · no credentials read');
  return p.paint(bits.join(' · '), 'dim');
}

/** Renders the compact, colorized HUD. */
export function renderSnapshot(snapshot: HudSnapshot, options: RenderOptions = {}): string {
  const p = createPalette(colorEnabled(options.color));
  const lines: string[] = [headerLine(snapshot, p)];

  const meter = meterLine(snapshot, p);
  if (meter) lines.push(meter);

  const tools = toolsLine(snapshot, p);
  if (tools) lines.push(tools);

  lines.push(footerLine(snapshot, p));

  if (options.footer) lines.push(p.paint(options.footer, 'dim'));

  return lines.join('\n');
}

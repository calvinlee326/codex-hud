import type { ColorName, Palette } from './colors.js';

/**
 * Renders a compact colored progress bar for a 0..1 fraction, e.g. `▰▰▰▱▱▱`.
 * Falls back to a dim empty bar when the fraction is unknown.
 */
export function bar(
  fraction: number | undefined,
  palette: Palette,
  color: ColorName = 'green',
  width = 10,
): string {
  if (fraction === undefined) return palette.paint('░'.repeat(width), 'dim');
  const clamped = Math.max(0, Math.min(1, fraction));
  const filled = Math.round(clamped * width);
  const full = palette.paint('█'.repeat(filled), color);
  const empty = palette.paint('░'.repeat(width - filled), 'dim');
  return `${full}${empty}`;
}

/** Picks a bar color by severity: green < ~70%, yellow < ~90%, red beyond. */
export function severityColor(fraction: number | undefined): ColorName {
  if (fraction === undefined) return 'green';
  if (fraction >= 0.9) return 'red';
  if (fraction >= 0.7) return 'yellow';
  return 'green';
}

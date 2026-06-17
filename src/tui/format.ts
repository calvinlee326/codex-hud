export function formatDuration(ms: number | undefined): string {
  if (ms === undefined || ms < 0) return 'n/a';
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}

export function formatPercent(fraction: number | undefined): string {
  if (fraction === undefined) return 'est. n/a';
  return `est. ${Math.round(fraction * 100)}%`;
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  if (max <= 1) return value.slice(0, max);
  return value.slice(0, max - 1) + '…';
}

export function orUnknown(value: string | undefined): string {
  return value && value.length > 0 ? value : 'unknown';
}

export function orNa(value: string | undefined): string {
  return value && value.length > 0 ? value : 'n/a';
}

/** Renders aligned `label  value` rows with a consistent gutter. */
export function renderRows(rows: Array<[string, string]>, labelWidth = 10): string {
  return rows.map(([label, value]) => `${label.padEnd(labelWidth)}${value}`).join('\n');
}

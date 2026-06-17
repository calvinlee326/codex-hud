/**
 * Renders a fixed-width text progress bar for a 0..1 fraction. Returns an empty
 * placeholder bar when the fraction is unknown.
 */
export function progressBar(fraction: number | undefined, width = 16): string {
  if (fraction === undefined) return `[${'─'.repeat(width)}]`;
  const clamped = Math.max(0, Math.min(1, fraction));
  const filled = Math.round(clamped * width);
  return `[${'█'.repeat(filled)}${'─'.repeat(width - filled)}]`;
}

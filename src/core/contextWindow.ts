import type { TokenUsage } from '../types/session.js';

/**
 * Approximate context-window sizes (tokens) by model family. Used only to derive
 * a clearly-labeled *estimated* context-usage percentage. Never treated as an
 * official quota.
 */
const CONTEXT_WINDOWS: Array<{ match: RegExp; window: number }> = [
  { match: /gpt-5/i, window: 400_000 },
  { match: /gpt-4\.1/i, window: 1_000_000 },
  { match: /o[34]/i, window: 200_000 },
  { match: /codex/i, window: 256_000 },
];

export function contextWindowFor(model: string | undefined): number | undefined {
  if (!model) return undefined;
  return CONTEXT_WINDOWS.find((c) => c.match.test(model))?.window;
}

/**
 * Returns an estimated context-usage fraction (0..1), or undefined when it
 * cannot be derived. Always presented to the user as an estimate.
 */
export function estimateContextUsage(
  usage: TokenUsage | undefined,
  model: string | undefined,
  knownWindow?: number,
): number | undefined {
  const window = knownWindow ?? contextWindowFor(model);
  const used = usage?.total ?? sumUsage(usage);
  if (!window || used === undefined) return undefined;
  return Math.min(1, used / window);
}

function sumUsage(usage: TokenUsage | undefined): number | undefined {
  if (!usage) return undefined;
  const parts = [usage.input, usage.output].filter((v): v is number => v !== undefined);
  return parts.length > 0 ? parts.reduce((a, b) => a + b, 0) : undefined;
}

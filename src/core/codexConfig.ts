import { readFile } from 'node:fs/promises';
import { parse } from 'smol-toml';
import { z } from 'zod';
import type { CodexConfig, ReasoningEffort, StatusLineSetting } from '../types/codex.js';
import { ConfigParseError } from './errors.js';

const REASONING_EFFORTS: ReasoningEffort[] = ['minimal', 'low', 'medium', 'high', 'xhigh'];

const reasoningSchema = z.enum(['minimal', 'low', 'medium', 'high', 'xhigh']);

/**
 * Reads and parses a Codex config.toml. Returns undefined if the file is
 * absent. Throws ConfigParseError on malformed TOML.
 */
export async function readCodexConfig(path: string): Promise<CodexConfig | undefined> {
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw new ConfigParseError(`Failed to read ${path}`, { cause: err });
  }

  let raw: Record<string, unknown>;
  try {
    raw = parse(text) as Record<string, unknown>;
  } catch (err) {
    throw new ConfigParseError(`Invalid TOML in ${path}`, { cause: err });
  }

  return {
    model: typeof raw.model === 'string' ? raw.model : undefined,
    modelReasoningEffort: parseReasoning(raw.model_reasoning_effort),
    planModeReasoningEffort:
      typeof raw.plan_mode_reasoning_effort === 'string'
        ? raw.plan_mode_reasoning_effort
        : undefined,
    statusLine: parseStatusLine(raw),
    raw,
    sourcePath: path,
  };
}

function parseReasoning(value: unknown): ReasoningEffort | undefined {
  const result = reasoningSchema.safeParse(value);
  return result.success ? result.data : undefined;
}

/**
 * Extracts the `tui.status_line` value, tolerating both `[tui]` table form and
 * dotted-key form. Distinguishes an explicit `null` (disabled) from absence.
 */
export function parseStatusLine(raw: Record<string, unknown>): StatusLineSetting {
  const tui = raw.tui;
  let value: unknown;
  let present = false;

  if (tui && typeof tui === 'object' && 'status_line' in (tui as object)) {
    present = true;
    value = (tui as Record<string, unknown>).status_line;
  } else if ('tui.status_line' in raw) {
    present = true;
    value = raw['tui.status_line'];
  }

  if (!present) return { kind: 'absent' };
  if (value === null) return { kind: 'disabled' };
  if (Array.isArray(value)) {
    return { kind: 'array', items: value.filter((v): v is string => typeof v === 'string') };
  }
  return { kind: 'absent' };
}

export { REASONING_EFFORTS };

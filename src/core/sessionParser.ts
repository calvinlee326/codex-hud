import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import type {
  SessionSummary,
  ToolUseCount,
  TokenUsage,
  RateLimits,
  RateWindow,
} from '../types/session.js';

export interface ParseOptions {
  maxLines?: number;
  maxBytes?: number;
}

const DEFAULT_MAX_LINES = 100_000;
const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;

/**
 * Streams a rollout JSONL file and reduces it to a privacy-safe SessionSummary.
 *
 * Only counts and metadata are retained: message *bodies* are never copied into
 * the result. Malformed lines are skipped and counted. Unknown item types are
 * ignored. The schema is probed leniently because the exact Codex rollout JSON
 * shape varies by version.
 */
export async function parseSession(
  filePath: string,
  options: ParseOptions = {},
): Promise<SessionSummary> {
  const maxLines = options.maxLines ?? DEFAULT_MAX_LINES;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  const summary: SessionSummary = {
    filePath,
    userMessageCount: 0,
    agentMessageCount: 0,
    toolCounts: [],
    turnCount: 0,
    linesRead: 0,
    malformedLines: 0,
    truncated: false,
  };
  const toolMap = new Map<string, number>();

  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  let bytes = 0;
  try {
    for await (const line of rl) {
      bytes += Buffer.byteLength(line, 'utf8') + 1;
      if (summary.linesRead >= maxLines || bytes > maxBytes) {
        summary.truncated = true;
        break;
      }
      summary.linesRead++;

      const trimmed = line.trim();
      if (trimmed.length === 0) continue;

      let obj: unknown;
      try {
        obj = JSON.parse(trimmed);
      } catch {
        summary.malformedLines++;
        continue;
      }
      reduceLine(obj, summary, toolMap);
    }
  } finally {
    rl.close();
    stream.destroy();
  }

  summary.toolCounts = [...toolMap.entries()]
    .map(([name, count]): ToolUseCount => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  if (summary.startedAt && summary.lastActivityAt) {
    summary.durationMs = summary.lastActivityAt.getTime() - summary.startedAt.getTime();
  }

  return summary;
}

function reduceLine(
  obj: unknown,
  summary: SessionSummary,
  toolMap: Map<string, number>,
): void {
  if (!isRecord(obj)) return;

  const ts = parseTimestamp(obj.timestamp ?? obj.ts);
  if (ts) {
    if (!summary.startedAt) summary.startedAt = ts;
    summary.lastActivityAt = ts;
  }

  const itemType = String(obj.type ?? '');
  const payload = isRecord(obj.payload) ? obj.payload : isRecord(obj.item) ? obj.item : obj;

  switch (itemType) {
    case 'session_meta':
      applySessionMeta(payload, summary);
      break;
    case 'turn_context':
      applyTurnContext(payload, summary);
      break;
    case 'event_msg':
      applyEventMsg(payload, summary);
      break;
    case 'response_item':
      applyResponseItem(payload, toolMap);
      break;
    default:
      break;
  }
}

function applySessionMeta(p: Record<string, unknown>, summary: SessionSummary): void {
  summary.meta = {
    id: strOrUndef(p.id),
    cwd: strOrUndef(p.cwd),
    cliVersion: strOrUndef(p.cli_version),
    modelProvider: strOrUndef(p.model_provider),
  };
  if (!summary.model && typeof p.model === 'string') summary.model = p.model;
}

function applyTurnContext(p: Record<string, unknown>, summary: SessionSummary): void {
  if (typeof p.model === 'string') summary.model = p.model;
  const effort = p.effort ?? p.model_reasoning_effort ?? p.reasoning_effort;
  if (typeof effort === 'string') summary.reasoningEffort = effort;
}

function applyEventMsg(p: Record<string, unknown>, summary: SessionSummary): void {
  const inner = isRecord(p.msg) ? p.msg : p;
  const kind = String(p.type ?? inner.type ?? '').toLowerCase();

  switch (kind) {
    case 'user_message':
    case 'usermessage':
      summary.userMessageCount++;
      break;
    case 'agent_message':
    case 'agentmessage':
      summary.agentMessageCount++;
      break;
    case 'token_count':
    case 'tokencount':
      applyTokenCount(inner, summary);
      break;
    case 'task_started':
      captureContextWindow(inner, summary);
      break;
    case 'turn_complete':
    case 'turncomplete':
    case 'task_complete':
      summary.turnCount++;
      break;
    default:
      break;
  }
}

function applyTokenCount(p: Record<string, unknown>, summary: SessionSummary): void {
  const info = isRecord(p.info) ? p.info : p;
  captureContextWindow(info, summary);
  const usage = parseTokenUsage(info);
  if (usage) summary.latestTokenUsage = usage;
  const limits = parseRateLimits(p.rate_limits);
  if (limits) summary.rateLimits = limits;
}

function parseRateLimits(v: unknown): RateLimits | undefined {
  if (!isRecord(v)) return undefined;
  const primary = parseRateWindow(v.primary);
  const secondary = parseRateWindow(v.secondary);
  if (!primary && !secondary) return undefined;
  return { primary, secondary };
}

function parseRateWindow(v: unknown): RateWindow | undefined {
  if (!isRecord(v)) return undefined;
  const usedPercent = numOrUndef(v.used_percent);
  if (usedPercent === undefined) return undefined;
  const resetsAtSec = numOrUndef(v.resets_at);
  return {
    usedPercent,
    windowMinutes: numOrUndef(v.window_minutes),
    resetsAt: resetsAtSec ? new Date(resetsAtSec * 1000) : undefined,
  };
}

function captureContextWindow(p: Record<string, unknown>, summary: SessionSummary): void {
  const window = numOrUndef(p.model_context_window);
  if (window) summary.modelContextWindow = window;
}

function applyResponseItem(p: Record<string, unknown>, toolMap: Map<string, number>): void {
  // Tool/function calls are response items whose type ends in `_call`
  // (function_call, custom_tool_call, tool_search_call, web_search_call, ...).
  // Their paired `_call_output` items are not counted.
  const type = String(p.type ?? '').toLowerCase();
  if (!type.endsWith('_call')) return;
  const name = strOrUndef(p.name) ?? friendlyToolName(type);
  toolMap.set(name, (toolMap.get(name) ?? 0) + 1);
}

function friendlyToolName(type: string): string {
  return type.replace(/_call$/, '');
}

function parseTokenUsage(info: Record<string, unknown>): TokenUsage | undefined {
  // Codex nests usage under info.total_token_usage (with last_token_usage as the
  // most recent turn). Fall back to flat fields for older/other shapes.
  const total = isRecord(info.total_token_usage) ? info.total_token_usage : info;
  const usage: TokenUsage = {
    input: numOrUndef(total.input_tokens ?? total.input),
    output: numOrUndef(total.output_tokens ?? total.output),
    reasoning: numOrUndef(total.reasoning_output_tokens ?? total.reasoning_tokens),
    total: numOrUndef(total.total_tokens ?? total.total),
  };
  const hasAny = Object.values(usage).some((v) => v !== undefined);
  return hasAny ? usage : undefined;
}

/** Reads just the session cwd from the first session_meta line, cheaply. */
export async function peekSessionCwd(filePath: string): Promise<string | undefined> {
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let scanned = 0;
  try {
    for await (const line of rl) {
      if (scanned++ > 20) break;
      const trimmed = line.trim();
      if (!trimmed) continue;
      let obj: unknown;
      try {
        obj = JSON.parse(trimmed);
      } catch {
        continue;
      }
      if (isRecord(obj) && String(obj.type ?? '') === 'session_meta') {
        const p = isRecord(obj.payload) ? obj.payload : obj;
        return strOrUndef(p.cwd);
      }
    }
  } finally {
    rl.close();
    stream.destroy();
  }
  return undefined;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function strOrUndef(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function numOrUndef(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function parseTimestamp(v: unknown): Date | undefined {
  if (typeof v === 'string') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    const ms = v > 1e12 ? v : v * 1000;
    return new Date(ms);
  }
  return undefined;
}

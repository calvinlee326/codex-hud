import fg from 'fast-glob';
import { stat } from 'node:fs/promises';
import { codexSessionsDir } from './paths.js';
import { peekSessionCwd, parseSession } from './sessionParser.js';
import type { RateLimits, TokenUsage } from '../types/session.js';

export interface SessionCandidate {
  filePath: string;
  mtimeMs: number;
}

/** Lists session JSONL files newest-first (by filename timestamp, then mtime). */
export async function listSessions(sessionsDir = codexSessionsDir()): Promise<SessionCandidate[]> {
  const matches = await fg('**/*.jsonl', {
    cwd: sessionsDir,
    absolute: true,
    onlyFiles: true,
    suppressErrors: true,
  });

  const withMeta = await Promise.all(
    matches.map(async (filePath) => {
      let mtimeMs = 0;
      try {
        mtimeMs = (await stat(filePath)).mtimeMs;
      } catch {
        /* ignore unreadable */
      }
      return { filePath, mtimeMs };
    }),
  );

  return withMeta.sort((a, b) => {
    const byName = b.filePath.localeCompare(a.filePath);
    if (byName !== 0) return byName;
    return b.mtimeMs - a.mtimeMs;
  });
}

/**
 * Selects the most relevant session for `projectPath`: the newest whose
 * recorded cwd matches the project, falling back to the globally newest.
 * Returns undefined if no sessions exist.
 */
export async function selectSession(
  projectPath: string,
  sessionsDir = codexSessionsDir(),
): Promise<string | undefined> {
  const candidates = await listSessions(sessionsDir);
  if (candidates.length === 0) return undefined;

  for (const candidate of candidates) {
    const cwd = await peekSessionCwd(candidate.filePath);
    if (cwd && cwd === projectPath) return candidate.filePath;
  }

  return candidates[0]?.filePath;
}

export interface RecentUsage {
  rateLimits?: RateLimits;
  latestTokenUsage?: TokenUsage;
  modelContextWindow?: number;
}

/**
 * A brand-new session has no token_count yet, so the per-prompt hook fires
 * before any context/usage exists. This scans the most recent sessions and
 * returns the latest usage data found (rate limits are account-global; context
 * is the last known value), so the HUD is populated from the first prompt and
 * then updates once the current session records its own token_count.
 */
export async function findRecentUsage(
  sessionsDir = codexSessionsDir(),
  maxFiles = 3,
): Promise<RecentUsage> {
  const candidates = await listSessions(sessionsDir);
  const out: RecentUsage = {};
  for (const candidate of candidates.slice(0, maxFiles)) {
    const summary = await parseSession(candidate.filePath).catch(() => undefined);
    if (!summary) continue;
    if (!out.rateLimits && summary.rateLimits) out.rateLimits = summary.rateLimits;
    if (!out.latestTokenUsage && summary.latestTokenUsage) {
      out.latestTokenUsage = summary.latestTokenUsage;
      out.modelContextWindow = summary.modelContextWindow;
    }
    if (out.rateLimits && out.latestTokenUsage) break;
  }
  return out;
}

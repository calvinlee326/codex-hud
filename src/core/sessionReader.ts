import fg from 'fast-glob';
import { stat } from 'node:fs/promises';
import { codexSessionsDir } from './paths.js';
import { peekSessionCwd } from './sessionParser.js';

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

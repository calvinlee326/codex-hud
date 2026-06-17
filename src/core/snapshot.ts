import { basename } from 'node:path';
import { detectCodex } from './codex.js';
import { readCodexConfig } from './codexConfig.js';
import { readGitInfo } from './git.js';
import { selectSession } from './sessionReader.js';
import { parseSession } from './sessionParser.js';
import { gatherEnvironment } from './environment.js';
import { codexConfigPath, projectCodexConfigPath } from './paths.js';
import type { HudSnapshot } from '../types/app.js';

export interface SnapshotOptions {
  projectPath?: string;
  sessionPath?: string;
  /** Skip spawning `codex --version` (used by the per-prompt hook for speed). */
  skipCodexDetect?: boolean;
}

/**
 * Assembles a full HUD snapshot from local data sources. Each source degrades
 * independently — a failure in one (e.g. no git) never breaks the others.
 */
export async function buildSnapshot(options: SnapshotOptions = {}): Promise<HudSnapshot> {
  const projectPath = options.projectPath ?? process.cwd();

  const [codex, userConfig, projectConfig, git, environment] = await Promise.all([
    options.skipCodexDetect ? Promise.resolve({ found: true }) : detectCodex(),
    readCodexConfig(codexConfigPath()).catch(() => undefined),
    readCodexConfig(projectCodexConfigPath(projectPath)).catch(() => undefined),
    readGitInfo(projectPath),
    gatherEnvironment(projectPath),
  ]);

  const config = projectConfig ?? userConfig;

  const sessionPath = options.sessionPath ?? (await selectSession(projectPath));
  const session = sessionPath ? await parseSession(sessionPath).catch(() => undefined) : undefined;

  return {
    codex,
    config,
    project: {
      path: projectPath,
      name: basename(projectPath),
      git,
    },
    session,
    environment,
    generatedAt: new Date(),
  };
}

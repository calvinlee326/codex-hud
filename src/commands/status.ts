import { buildSnapshot } from '../core/snapshot.js';
import { estimateContextUsage } from '../core/contextWindow.js';
import { renderSnapshot } from '../tui/renderer.js';
import { readAppConfig } from '../config/appConfig.js';
import { PRIVACY_STATEMENT } from '../core/privacy.js';
import { tildify } from '../core/paths.js';
import type { HudSnapshot } from '../types/app.js';

export interface StatusFlags {
  json?: boolean;
  project?: string;
  session?: string;
  color?: boolean;
}

export async function runStatus(flags: StatusFlags): Promise<number> {
  const appConfig = await readAppConfig();
  const snapshot = await buildSnapshot({
    projectPath: flags.project,
    sessionPath: flags.session ?? appConfig.sessionPathOverride,
  });

  if (flags.json) {
    process.stdout.write(JSON.stringify(toJson(snapshot), null, 2) + '\n');
    return 0;
  }

  process.stdout.write(renderSnapshot(snapshot, { config: appConfig, showBar: true }) + '\n');
  return 0;
}

/** Privacy-safe JSON projection: counts and metadata only, no message bodies. */
export function toJson(snapshot: HudSnapshot) {
  const model = snapshot.session?.model ?? snapshot.config?.model;
  return {
    codex: snapshot.codex,
    project: {
      name: snapshot.project.name,
      path: tildify(snapshot.project.path),
      git: snapshot.project.git,
    },
    model,
    reasoningEffort: snapshot.session?.reasoningEffort ?? snapshot.config?.modelReasoningEffort,
    session: snapshot.session
      ? {
          filePath: tildify(snapshot.session.filePath),
          durationMs: snapshot.session.durationMs,
          userMessageCount: snapshot.session.userMessageCount,
          agentMessageCount: snapshot.session.agentMessageCount,
          turnCount: snapshot.session.turnCount,
          toolCounts: snapshot.session.toolCounts,
          estimatedTokenUsage: snapshot.session.latestTokenUsage,
          estimatedContextFraction: estimateContextUsage(
            snapshot.session.latestTokenUsage,
            model,
            snapshot.session.modelContextWindow,
          ),
          truncated: snapshot.session.truncated,
        }
      : null,
    privacy: PRIVACY_STATEMENT,
    generatedAt: snapshot.generatedAt.toISOString(),
  };
}

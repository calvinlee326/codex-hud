import type { HudSnapshot } from '../types/app.js';
import type { AppConfig } from '../types/app.js';
import { estimateContextUsage } from '../core/contextWindow.js';
import { PRIVACY_STATEMENT } from '../core/privacy.js';
import { formatDuration, formatPercent, orNa, orUnknown, renderRows, truncate } from './format.js';
import { progressBar } from './bars.js';

export interface RenderOptions {
  config?: AppConfig;
  title?: string;
  showBar?: boolean;
}

function gitCell(snapshot: HudSnapshot): string {
  const git = snapshot.project.git;
  if (!git.isRepo) return 'not a repo';
  const branch = orUnknown(git.branch);
  const dirty = git.dirty ? ' *' : '';
  let ahead = '';
  if (git.ahead) ahead += ` ↑${git.ahead}`;
  if (git.behind) ahead += ` ↓${git.behind}`;
  return `${branch}${dirty}${ahead}`;
}

function toolsCell(snapshot: HudSnapshot): string {
  const tools = snapshot.session?.toolCounts ?? [];
  if (tools.length === 0) return 'none';
  return tools
    .slice(0, 5)
    .map((t) => `${t.name} x${t.count}`)
    .join('  ');
}

function modelCell(snapshot: HudSnapshot): string {
  const sessionModel = snapshot.session?.model;
  const configModel = snapshot.config?.model;
  return orUnknown(sessionModel ?? configModel);
}

function reasoningCell(snapshot: HudSnapshot): string {
  return orUnknown(snapshot.session?.reasoningEffort ?? snapshot.config?.modelReasoningEffort);
}

/** Renders the one-shot HUD snapshot as plain text. */
export function renderSnapshot(snapshot: HudSnapshot, options: RenderOptions = {}): string {
  const config = options.config;
  const title = options.title ?? 'Codex HUD Dashboard';
  const model = modelCell(snapshot);

  const rows: Array<[string, string]> = [];
  rows.push(['Codex', snapshot.codex.found ? `v${orNa(snapshot.codex.version)}` : 'not found']);
  rows.push(['Project', truncate(snapshot.project.name, 40)]);

  if (!config || config.showGit) rows.push(['Git', gitCell(snapshot)]);

  rows.push(['Model', model]);
  rows.push(['Reasoning', reasoningCell(snapshot)]);

  if (snapshot.session) {
    rows.push(['Session', 'latest session found']);
    if (!config || config.showTools) rows.push(['Tools', toolsCell(snapshot)]);
    rows.push(['Duration', formatDuration(snapshot.session.durationMs)]);
    if (!config || config.showEstimatedTokens) {
      const usage = estimateContextUsage(
        snapshot.session.latestTokenUsage,
        model,
        snapshot.session.modelContextWindow,
      );
      const bar = options.showBar ? `${progressBar(usage)} ` : '';
      rows.push(['Context', `${bar}${formatPercent(usage)}`]);
    }
  } else {
    rows.push(['Session', 'no session found']);
  }

  rows.push(['Privacy', PRIVACY_STATEMENT]);

  return `${title}\n\n${renderRows(rows)}`;
}

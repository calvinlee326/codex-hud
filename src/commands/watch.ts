import chokidar from 'chokidar';
import { buildSnapshot } from '../core/snapshot.js';
import { renderSnapshot } from '../tui/renderer.js';
import { readAppConfig } from '../config/appConfig.js';
import { selectSession } from '../core/sessionReader.js';
import { codexSessionsDir } from '../core/paths.js';

export interface WatchFlags {
  project?: string;
  session?: string;
  interval?: number;
}

export async function runWatch(flags: WatchFlags): Promise<number> {
  const appConfig = await readAppConfig();
  const projectPath = flags.project ?? process.cwd();
  const intervalMs = flags.interval ?? appConfig.refreshIntervalMs;

  let pending = false;
  let lastOutput = '';

  const render = async () => {
    if (pending) return;
    pending = true;
    try {
      const sessionPath =
        flags.session ?? appConfig.sessionPathOverride ?? (await selectSession(projectPath));
      const snapshot = await buildSnapshot({ projectPath, sessionPath });
      const output =
        renderSnapshot(snapshot, { config: appConfig, title: 'Codex HUD', showBar: true }) +
        `\n\nUpdated ${new Date().toLocaleTimeString()}  ·  Ctrl+C to exit`;
      if (output !== lastOutput) {
        lastOutput = output;
        process.stdout.write('\x1b[2J\x1b[H' + output + '\n');
      }
    } finally {
      pending = false;
    }
  };

  await render();

  const watcher = chokidar.watch(codexSessionsDir(), {
    ignoreInitial: true,
    depth: 6,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });
  watcher.on('all', () => void render());
  watcher.on('error', () => {
    /* fall back to interval-only refresh */
  });

  const timer = setInterval(() => void render(), intervalMs);

  return await new Promise<number>((resolve) => {
    const shutdown = () => {
      clearInterval(timer);
      void watcher.close();
      process.stdout.write('\n');
      resolve(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
}

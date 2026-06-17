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

const ENTER_ALT_SCREEN = '\x1b[?1049h\x1b[?25l';
const LEAVE_ALT_SCREEN = '\x1b[?25h\x1b[?1049l';
const HOME_AND_CLEAR = '\x1b[H\x1b[2J';

export async function runWatch(flags: WatchFlags): Promise<number> {
  const appConfig = await readAppConfig();
  const projectPath = flags.project ?? process.cwd();
  const intervalMs = flags.interval ?? appConfig.refreshIntervalMs;
  const isTty = Boolean(process.stdout.isTTY);

  let pending = false;

  const render = async () => {
    if (pending) return;
    pending = true;
    try {
      const sessionPath =
        flags.session ?? appConfig.sessionPathOverride ?? (await selectSession(projectPath));
      const snapshot = await buildSnapshot({ projectPath, sessionPath });
      const output = renderSnapshot(snapshot, {
        config: appConfig,
        color: isTty,
        footer: `Updated ${new Date().toLocaleTimeString()} · Ctrl+C to exit`,
      });
      // On a TTY, repaint in place from the top of the alternate screen so the
      // HUD never scrolls. Otherwise (piped output) just append each frame.
      process.stdout.write(isTty ? `${HOME_AND_CLEAR}${output}\n` : `${output}\n`);
    } finally {
      pending = false;
    }
  };

  if (isTty) process.stdout.write(ENTER_ALT_SCREEN);
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
    let done = false;
    const shutdown = () => {
      if (done) return;
      done = true;
      clearInterval(timer);
      void watcher.close();
      if (isTty) process.stdout.write(LEAVE_ALT_SCREEN);
      resolve(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
}

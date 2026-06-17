import {
  installPromptHook,
  uninstallPromptHook,
  isPromptHookInstalled,
  hookCommand,
} from '../core/codexHooks.js';
import { codexHooksPath, tildify } from '../core/paths.js';

export type HooksSub = 'install' | 'uninstall' | 'status';

export interface HooksFlags {
  color?: boolean;
}

export async function runHooks(sub: HooksSub, flags: HooksFlags = {}): Promise<number> {
  switch (sub) {
    case 'install': {
      const result = await installPromptHook(hookCommand(flags.color ?? true));
      process.stdout.write(
        result === 'already-installed'
          ? `codex-hud prompt hook already installed in ${tildify(codexHooksPath())}.\n`
          : `Installed UserPromptSubmit hook in ${tildify(codexHooksPath())}.\n` +
              'The HUD will now print above every prompt inside Codex.\n' +
              'Restart Codex (or start a new session) for it to take effect.\n',
      );
      return 0;
    }
    case 'uninstall': {
      const removed = await uninstallPromptHook();
      process.stdout.write(
        removed
          ? `Removed codex-hud hook from ${tildify(codexHooksPath())}.\n`
          : `No codex-hud hook found in ${tildify(codexHooksPath())}.\n`,
      );
      return 0;
    }
    case 'status': {
      const installed = await isPromptHookInstalled();
      process.stdout.write(
        installed
          ? `Installed: codex-hud prompt hook is active (${tildify(codexHooksPath())}).\n`
          : 'Not installed. Run `codex-hud hooks install` to show the HUD on every prompt.\n',
      );
      return installed ? 0 : 1;
    }
  }
}

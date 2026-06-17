import {
  detectShell,
  installShellIntegration,
  uninstallShellIntegration,
  shellFunctionBlock,
} from '../core/shellInit.js';
import { tildify } from '../core/paths.js';

export type ShellSub = 'install' | 'uninstall' | 'print';

export async function runShell(sub: ShellSub): Promise<number> {
  const target = detectShell();

  switch (sub) {
    case 'print':
      process.stdout.write(shellFunctionBlock(target.shell) + '\n');
      return 0;

    case 'install': {
      const result = await installShellIntegration(target);
      process.stdout.write(
        result === 'installed'
          ? `Added the codex shell function to ${tildify(target.rcPath)}.\n` +
              `Reload with: source ${tildify(target.rcPath)}\n`
          : `Already installed in ${tildify(target.rcPath)}.\n`,
      );
      return 0;
    }

    case 'uninstall': {
      const removed = await uninstallShellIntegration(target);
      process.stdout.write(
        removed
          ? `Removed the codex shell function from ${tildify(target.rcPath)}.\n`
          : `Nothing to remove in ${tildify(target.rcPath)}.\n`,
      );
      return 0;
    }
  }
}

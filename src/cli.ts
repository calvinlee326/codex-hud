#!/usr/bin/env node
import { cac } from 'cac';
import { runSetup } from './commands/setup.js';
import { runStatus } from './commands/status.js';
import { runWatch } from './commands/watch.js';
import { runDoctor } from './commands/doctor.js';
import { runConfig, type ConfigSub } from './commands/config.js';
import { runSkillInstall } from './commands/skill.js';
import { runHooksInstall } from './commands/hooks.js';

const cli = cac('codex-hud');

async function run(action: () => Promise<number>): Promise<void> {
  try {
    process.exitCode = await action();
  } catch (err) {
    process.stderr.write(`codex-hud: ${(err as Error).message}\n`);
    process.exitCode = 1;
  }
}

cli
  .command('setup', 'Detect Codex and configure codex-hud (the recommended first step)')
  .option('--dry-run', 'Show planned changes without writing anything')
  .option('--yes', 'Skip confirmation prompts')
  .option('--no-statusline', 'Do not modify the native Codex statusline')
  .option('--mode <mode>', 'Setup mode: basic | dashboard', { default: 'dashboard' })
  .action((opts) =>
    run(() =>
      runSetup({
        dryRun: opts.dryRun,
        yes: opts.yes,
        statusline: opts.statusline,
        mode: opts.mode,
      }),
    ),
  );

cli
  .command('status', 'Print a one-shot HUD snapshot')
  .option('--json', 'Output privacy-safe JSON')
  .option('--no-color', 'Disable ANSI color')
  .option('--project <path>', 'Project path to inspect')
  .option('--session <file>', 'Session JSONL file to parse')
  .action((opts) =>
    run(() =>
      runStatus({
        json: opts.json,
        color: opts.color,
        project: opts.project,
        session: opts.session,
      }),
    ),
  );

cli
  .command('watch', 'Live-refresh the HUD as Codex writes sessions')
  .option('--project <path>', 'Project path to inspect')
  .option('--session <file>', 'Session JSONL file to parse')
  .option('--interval <ms>', 'Refresh interval in milliseconds')
  .action((opts) =>
    run(() =>
      runWatch({
        project: opts.project,
        session: opts.session,
        interval: opts.interval ? Number.parseInt(opts.interval, 10) : undefined,
      }),
    ),
  );

cli.command('doctor', 'Diagnose whether codex-hud can work').action(() => run(runDoctor));

cli
  .command('config [sub]', 'Manage codex-hud settings: show | reset | path')
  .action((sub: string | undefined) => {
    const valid: ConfigSub[] = ['show', 'reset', 'path'];
    const chosen = (sub ?? 'show') as ConfigSub;
    if (!valid.includes(chosen)) {
      process.stderr.write(`Unknown config subcommand: ${sub}. Use show | reset | path.\n`);
      process.exitCode = 1;
      return;
    }
    return run(() => runConfig(chosen));
  });

cli
  .command('skill [sub]', 'Codex skill integration (planned)')
  .action(() => run(runSkillInstall));

cli
  .command('hooks [sub]', 'Codex lifecycle hooks (planned)')
  .action(() => run(runHooksInstall));

cli.help();
cli.version('0.1.0');

cli.parse();

if (!cli.matchedCommand && process.argv.slice(2).length === 0) {
  cli.outputHelp();
}

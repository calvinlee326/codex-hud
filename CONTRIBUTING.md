# Contributing to codex-hud-dashboard

Thanks for your interest! Contributions of all sizes are welcome.

## Development setup

```bash
git clone https://github.com/calvinlee326/codex-hud.git
cd codex-hud
npm install
npm run dev -- status     # run the CLI from source
```

Link it as the global command while developing:

```bash
npm run build && npm link
codex-hud status
```

Rebuild after edits (`npm run build`), or skip linking and use `npm run dev -- <cmd>`.

## Before opening a PR

```bash
npm run typecheck
npm test                  # vitest
npm run test:coverage     # core coverage must stay >= 80%
npm run build
```

## Guidelines

- **Privacy is non-negotiable.** The parser must only ever read counts and
  metadata — never transcript message bodies. Keep the privacy assertion tests
  passing. No network calls in `core/`.
- **Be tolerant of Codex schema drift.** Session JSONL shapes vary by Codex
  version; parsing must skip unknown/malformed data, never throw.
- **Config writes are backup-first, atomic, and reversible.** Anything that
  touches `~/.codex` (config, hooks) must back up before editing and be
  removable.
- Match the surrounding code style. Add tests for new behavior.
- Keep changes focused; one logical change per PR.

## Project layout

```
src/
  cli.ts            CLI entry (CAC)
  commands/         setup, status, watch, doctor, config, hooks, hook, shell, skill
  core/             codex/config/session/git/hooks/backup/privacy logic
  tui/              renderer, bars, format, colors (pure functions)
  config/           codex-hud app config
  types/            shared types
tests/              vitest
docs/               privacy, data-sources, statusline, roadmap
```

## Reporting bugs

Open an issue with your OS, Node version, `codex --version`, and the output of
`codex-hud doctor`. Never paste credentials or private transcript contents.

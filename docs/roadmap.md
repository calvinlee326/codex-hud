# Roadmap

## MVP (this release)

- `codex-hud setup` — detect environment, curate native status line (backup-first,
  reversible), write codex-hud config
- `codex-hud status` — one-shot HUD snapshot (+ `--json`)
- `codex-hud watch` — live HUD
- `codex-hud doctor` — diagnostics + privacy disclosure
- `codex-hud config` — show / reset / path
- Safe session parsing, git info, Codex config reading, ANSI rendering

## After MVP

- **Watch polish** — optional Ink rendering, a todos pane when parsable, richer
  context-window table.
- **Config expansion** — refresh interval, per-section toggles, privacy mode
  surfaced as `config set` subcommands.
- **`codex-hud hooks install`** — only if Codex exposes supported lifecycle hooks;
  confirmation required; metadata only, never prompt bodies or secrets.
- **`codex-hud skill install`** — a `$codex-hud` Codex skill that calls
  `codex-hud status --json` so you can ask Codex to summarize local HUD data.
- **Native custom status line** — if/when
  [openai/codex#20244](https://github.com/openai/codex/issues/20244) ships,
  `setup` could render a real codex-hud line inside the Codex TUI.

## Explicit non-goals

No Codex binary patching, no `codex-hud run codex` wrapper, no credential
scraping, no unofficial/official OpenAI API calls, no official quota claims, no
cloud sync, no telemetry, no transcript body display.

# codex-hud-dashboard

A safe, local-first terminal **HUD and usage dashboard for the OpenAI Codex
CLI**. Inspired by `claude-hud`, built for the easiest possible Codex experience:
install it, run `setup` once, then keep using `codex` exactly as you do today.

> **Local-first and privacy-safe.** codex-hud reads only local metadata Codex
> already writes. It makes **no network calls**, never scrapes credentials, never
> reads transcript message bodies, and never patches the Codex binary.

## Quick start

```bash
npm install -g codex-hud-dashboard
codex-hud setup     # detect Codex, curate the native status line, write config
codex               # open Codex normally — no wrapper, ever
codex-hud watch     # optional: richer live dashboard in a second pane
```

## What it shows

```text
Codex HUD Dashboard

Codex     v0.140.0
Project   split-money-app
Git       main *
Model     gpt-5.5
Reasoning high
Session   latest session found
Tools     shell x12  apply_patch x4  web_search x2
Duration  42m
Context   [█████───────────] est. 30%
Privacy   local-only, no credentials read
```

`codex-hud watch` renders the same view and refreshes as Codex writes to your
session.

## What `setup` changes

`setup` only ever writes the **`tui.status_line`** key in `~/.codex/config.toml`,
and it does so safely:

- Backs up `config.toml` (timestamped, verified) before any edit.
- Keeps every status-line item you already have; only **adds** missing core items.
- Shows a `before → after` diff. Preview with `codex-hud setup --dry-run`.
- Fully reversible with `codex-hud config reset`.

Codex's native status line supports a fixed set of built-in items, so the richer
view (tools, duration, estimated context, privacy badge) lives in `codex-hud
status` / `watch`. See [docs/statusline.md](docs/statusline.md).

## Privacy & safety

codex-hud reads `~/.codex/config.toml`, `~/.codex/sessions/**/*.jsonl` (metadata
and counts only), git metadata, `codex --version`, and its own config. It never
reads `auth.json`, API keys, tokens, cookies, secrets, or message bodies. Any
token/context figure is an **estimate** and labeled `est.`. Full details:
[docs/privacy.md](docs/privacy.md) and [docs/data-sources.md](docs/data-sources.md).

## Commands

| Command                  | Description                                            |
| ------------------------ | ------------------------------------------------------ |
| `codex-hud setup`        | Detect Codex and configure codex-hud (run this first)  |
| `codex-hud status`       | Print a one-shot HUD snapshot (`--json` for machines)  |
| `codex-hud watch`        | Live-refresh the HUD                                    |
| `codex-hud doctor`       | Diagnose installation and print a privacy disclosure   |
| `codex-hud config <sub>` | `show` \| `reset` \| `path`                            |
| `codex-hud skill`        | Codex skill integration (planned)                      |
| `codex-hud hooks`        | Codex lifecycle hooks (planned)                        |

Useful flags: `setup --dry-run --yes --no-statusline`;
`status --json --project <path> --session <file> --no-color`;
`watch --interval <ms>`.

## Configuration

codex-hud stores its settings at `$XDG_CONFIG_HOME/codex-hud/config.json` (or
`~/.config/codex-hud/config.json`). Inspect with `codex-hud config show`, find it
with `codex-hud config path`, and restore defaults (and your original Codex
status line) with `codex-hud config reset`.

## How it works

Everything is derived locally — see [docs/data-sources.md](docs/data-sources.md).
The session parser streams rollout JSONL files, tolerates schema variation across
Codex versions, and retains only counts and metadata.

## Development

```bash
npm install
npm run dev -- status      # run the CLI from source
npm test                   # vitest
npm run test:coverage      # coverage (core ≥ 80%)
npm run build              # compile to dist/
```

## Roadmap

See [docs/roadmap.md](docs/roadmap.md). Out of scope by design: binary patching,
a `run codex` wrapper, credential scraping, unofficial API calls, official quota
claims, cloud sync, and telemetry.

## License

MIT

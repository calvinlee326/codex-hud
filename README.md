# codex-hud-dashboard

[![npm version](https://img.shields.io/npm/v/codex-hud-dashboard.svg)](https://www.npmjs.com/package/codex-hud-dashboard)
[![CI](https://github.com/calvinlee326/codex-hud/actions/workflows/ci.yml/badge.svg)](https://github.com/calvinlee326/codex-hud/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/codex-hud-dashboard.svg)](LICENSE)
[![node](https://img.shields.io/node/v/codex-hud-dashboard.svg)](https://nodejs.org)

A safe, local-first terminal **HUD and usage dashboard for the OpenAI Codex
CLI**. The HUD layout and design are inspired by
[claude-hud](https://github.com/jarrodwatts/claude-hud) by
[Jarrod Watts](https://github.com/jarrodwatts), reimagined for Codex. Built for
the easiest possible Codex experience: install it, run `setup` once, then keep
using `codex` exactly as you do today.

<p align="center">
  <img src="docs/demo.gif" alt="codex-hud showing model, context, usage, rate limits, assets, and approval mode above a Codex session" width="820">
</p>

<!-- To update this image: take a terminal screenshot of `codex` starting with the
     HUD visible and save it as docs/demo.png. For an animated version, record with
     vhs (https://github.com/charmbracelet/vhs) and use docs/demo.gif instead. -->

> **Local-first and privacy-safe.** codex-hud reads only local metadata Codex
> already writes. It makes **no network calls**, never scrapes credentials, never
> reads transcript message bodies, and never patches the Codex binary.

## Quick start

```bash
npm install -g codex-hud-dashboard
codex-hud setup        # detect Codex; install the per-prompt hook, shell function, status line
source ~/.zshrc        # reload your shell (or open a new terminal)
codex                  # HUD shows above every prompt inside Codex
codex-hud watch        # optional: live dashboard in a second pane
```

After `setup`, the colorized HUD appears **above every prompt** inside Codex —
no separate command to remember. This uses Codex's `UserPromptSubmit` hook, which
codex-hud installs into `~/.codex/hooks.json` (merging with any existing hooks,
backup-first, reversible). `setup` also adds a `codex` shell function so the HUD
shows once at startup too.

Manage these independently:

- `codex-hud hooks install | uninstall | status` — the per-prompt HUD hook
- `codex-hud shell install | uninstall | print` — the startup `codex` function

Skip either during setup with `codex-hud setup --no-hooks` / `--no-shell`. If the
in-Codex colors look wrong on your terminal, reinstall plain with
`codex-hud hooks install --no-color`.

## What it shows

A colorized status block (colors shown here as plain text):

```text
[gpt-5.5 | high] │ codex-hud git:(main)* │ ⏱ 42m
Context ███░░░░░░░ 34% │ Usage ███████░░░ 71% (resets in 2h 16m) │ Weekly █░░░░░░░░░ 11% (resets in 6d 11h)
1 AGENTS.md │ 1 skills │ 7 hooks
✓ Edit ×15 │ ✓ Bash ×5
24 msgs · 5 turns · local-only · no credentials read
⏵⏵ approval: on-request · sandbox: workspace-write
```

- **Line 1** — model + reasoning effort, project + git branch (`*` = dirty), session duration
- **Line 2** — estimated context usage, plus your real 5-hour and weekly rate-limit usage with reset times
- **Line 3** — local assets: `AGENTS.md` docs, installed skills, configured hooks
- **Line 4** — recent tool calls and counts
- **Line 5** — message/turn counts and the privacy badge
- **Line 6** — Codex approval policy and sandbox mode

Bars turn yellow then red as usage climbs. Color auto-disables for non-TTY output
and respects `NO_COLOR` and `--no-color`. The per-prompt hook renders the same
block above each prompt; `codex-hud watch` renders it live in a separate pane.

## What `setup` changes

`setup` makes three scoped, reversible changes (preview them all with
`codex-hud setup --dry-run`):

1. **`~/.codex/hooks.json`** — installs a `UserPromptSubmit` hook so the HUD shows
   above every prompt. Merges with your existing hooks; never removes them.
2. **`~/.codex/config.toml`** — adds missing core items to the `tui.status_line`
   key (Codex's native bottom bar). Keeps every item you already have.
3. **Your shell rc** (`~/.zshrc` etc.) — adds a `codex` function so the HUD also
   prints once at startup.

Every file is backed up (timestamped, verified) before editing, and writes are
atomic. Undo the config/statusline with `codex-hud config reset`, the hook with
`codex-hud hooks uninstall`, and the shell function with `codex-hud shell
uninstall`. Skip any during setup with `--no-hooks` / `--no-statusline` /
`--no-shell`.

Codex's native status line only supports a fixed set of built-in items, so the
richer block (tools, rate limits, assets, approval) is delivered by the hook and
by `codex-hud status` / `watch`. See [docs/statusline.md](docs/statusline.md).

## Privacy & safety

codex-hud reads `~/.codex/config.toml`, `~/.codex/sessions/**/*.jsonl` (metadata
and counts only), git metadata, `codex --version`, and its own config. It never
reads `auth.json`, API keys, tokens, cookies, secrets, or message bodies. Context
usage is an **estimate** derived from local token counts, never presented as
official quota. Full details:
[docs/privacy.md](docs/privacy.md) and [docs/data-sources.md](docs/data-sources.md).

## Commands

| Command                  | Description                                            |
| ------------------------ | ------------------------------------------------------ |
| `codex-hud setup`        | Detect Codex and configure codex-hud (run this first)  |
| `codex-hud status`       | Print a one-shot HUD snapshot (`--json` for machines)  |
| `codex-hud watch`        | Live-refresh the HUD                                    |
| `codex-hud doctor`       | Diagnose installation and print a privacy disclosure   |
| `codex-hud config <sub>` | `show` \| `reset` \| `path`                            |
| `codex-hud shell <sub>`  | `install` \| `uninstall` \| `print` (the codex function) |
| `codex-hud hooks <sub>`  | `install` \| `uninstall` \| `status` (per-prompt HUD hook) |
| `codex-hud skill`        | Codex skill integration (planned)                      |

Useful flags: `setup --dry-run --yes --no-hooks --no-shell --no-statusline`;
`status --json --project <path> --session <file> --no-color`;
`watch --interval <ms>`; `hooks install --no-color`.

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

## Acknowledgments

The HUD design and layout are inspired by
[claude-hud](https://github.com/jarrodwatts/claude-hud) by
[Jarrod Watts](https://github.com/jarrodwatts) — a terminal HUD for Claude Code.
codex-hud reimplements the idea for the OpenAI Codex CLI using Codex's own local
session data and hooks. All code here is original; no claude-hud code is included.

## License

MIT

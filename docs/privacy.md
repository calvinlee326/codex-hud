# Privacy & Safety

codex-hud is **local-first** and designed to be safe by construction. It reads
only local metadata that the Codex CLI already writes to your machine, and it
makes **no network calls** of any kind.

## What codex-hud reads

- `~/.codex/config.toml` (and a project-level `.codex/config.toml` if present) —
  to detect your model and reasoning effort, and to manage the native status line
- `~/.codex/sessions/**/*.jsonl` — **metadata and counts only** (see below)
- Git metadata of the current repository (branch, dirty state, ahead/behind)
- `codex --version`
- codex-hud's own config file (`$XDG_CONFIG_HOME/codex-hud/config.json`)

## What codex-hud never reads

- `auth.json`, API keys, ChatGPT tokens, cookies, or keychains
- Environment secrets
- **Transcript message bodies.** The session parser only increments counters
  (user/agent message counts, per-tool call counts) and reads structured
  metadata (timestamps, model, token totals, context-window size). Message text
  and tool arguments/outputs are dropped on read and are never stored, logged, or
  emitted — including in `--json` output.

## How this is enforced

- A centralized path allowlist (`src/core/privacy.ts`) governs what may be read
  or written; credential filenames are explicitly denied.
- The session reducer has no field capable of holding a message body, so bodies
  cannot leak into any result. This is covered by a test that asserts no known
  secret string ever appears in parser output.
- All writes during `setup` are backup-first, atomic, and scoped to the
  `tui.status_line` key only.

## Estimated vs. official numbers

Any token or context-usage figure is **estimated** and is always labeled `est.`.
codex-hud does not claim to show official quota or rate-limit data.

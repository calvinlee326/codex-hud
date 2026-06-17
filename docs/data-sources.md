# Data Sources

codex-hud derives everything it shows from these local sources.

## 1. `~/.codex/config.toml`

Read for `model`, `model_reasoning_effort`, and the current `tui.status_line`
value. `setup` also writes (only) the `tui.status_line` key here, backup-first.

## 2. `~/.codex/sessions/**/*.jsonl` (rollout files)

Codex writes one JSONL "rollout" file per session at
`~/.codex/sessions/YYYY/MM/DD/rollout-<timestamp>-<uuid>.jsonl`. Each line is a
`RolloutLine`: a UTC `timestamp` plus a typed item under `payload`.

Item types codex-hud uses:

| `type`          | What we extract                                              |
| --------------- | ----------------------------------------------------------- |
| `session_meta`  | `id`, `cwd`, `cli_version`, `model_provider`                 |
| `turn_context`  | `model`, `effort` (reasoning effort)                         |
| `event_msg`     | `user_message` / `agent_message` → counts; `token_count` → token totals + `model_context_window`; `task_started` → context window |
| `response_item` | any `*_call` (e.g. `function_call`, `custom_tool_call`, `web_search_call`) → per-tool counts |

Message bodies, tool arguments, and tool outputs are ignored.

Token usage is read from `event_msg.payload.info.total_token_usage`
(`input_tokens`, `output_tokens`, `reasoning_output_tokens`, `total_tokens`).

> The exact rollout schema varies by Codex version. The parser is intentionally
> lenient: it tolerates unknown item types, missing fields, and malformed lines
> (which are skipped and counted), and probes alternate field shapes.

## 3. Git metadata

Via `git` in the current directory: `rev-parse`, `branch --show-current`,
`status --porcelain`, and `rev-list` for ahead/behind.

## 4. `codex --version`

To detect Codex and display its version.

## 5. codex-hud config

`$XDG_CONFIG_HOME/codex-hud/config.json` (or `~/.config/codex-hud/config.json`):
display preferences and the reversibility metadata recorded by `setup`.

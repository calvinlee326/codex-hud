# Native Codex Status Line

## What Codex supports

Codex has a **built-in** status line configured via the `tui.status_line` key in
`~/.codex/config.toml`. The value is an ordered array of predefined item ids,
for example:

```toml
tui.status_line = ["model", "context_usage", "cwd"]
```

Setting it to `null` disables the status line. You can also edit it
interactively inside Codex with the `/statusline` slash command.

## Assumptions (and why they matter)

The exact set of accepted item ids **varies by Codex version** and is not
guaranteed stable. The ids codex-hud treats as known are:

```
model, approval, context_usage, session_id, sandbox, cwd, spinner
```

> If your Codex version supports additional ids (e.g. `git_branch`,
> `rate_limits`, `tokens`), codex-hud will **not** remove them — see below.

## What `codex-hud setup` does

`setup` is deliberately conservative and reversible:

1. Reads your current `tui.status_line` value.
2. Computes a plan that **keeps every item you already have** (known or unknown),
   in order, and only **appends** missing core items (`model`, `context_usage`,
   `cwd`) that are in the known allowlist. It never reorders or drops your items.
3. Shows you a `before → after` diff. Use `--dry-run` to preview without writing.
4. Backs up `config.toml` (timestamped, verified) before any edit.
5. Writes only the `tui.status_line` key via a surgical, atomic edit that
   preserves your comments and other settings.
6. Records the prior value and backup path so `codex-hud config reset` can
   restore your original configuration.

If editing is not safe on your version, `setup` skips the change and points you
to the `/statusline` command and `codex-hud watch` instead.

## Why the rich HUD is a separate command

There is **no supported way** to render an arbitrary external command's output
inside Codex's native status line today (tracked upstream in
[openai/codex#20244](https://github.com/openai/codex/issues/20244)). So the
unique codex-hud view — recent tools, session duration, estimated context %, and
the privacy badge — lives in `codex-hud status` (snapshot) and `codex-hud watch`
(live), which you run alongside Codex. If command-backed status lines land
upstream, codex-hud can render a real line in the TUI.

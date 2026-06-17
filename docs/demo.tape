# Record with: vhs docs/demo.tape  ->  outputs docs/demo.gif
Output docs/demo.gif

Set Shell zsh
Set FontSize 16
Set Width 1100
Set Height 600
Set Padding 20
Set Theme "Catppuccin Mocha"

# Load the `codex` shell function (startup HUD) from your rc, then clear
Hide
Type "source ~/.zshrc"
Enter
Sleep 1s
Type "clear"
Enter
Sleep 500ms
Show

# Launch Codex — the HUD prints at startup and above each prompt
Type "codex"
Sleep 500ms
Enter
Sleep 8s

# Type a prompt; the per-prompt HUD renders above it
Type "list the files in this project"
Sleep 1s
Enter
Sleep 10s

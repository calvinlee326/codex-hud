export async function runSkillInstall(): Promise<number> {
  process.stdout.write(
    'codex-hud skill: planned, not yet available.\n\n' +
      'A future release will install a Codex skill that calls `codex-hud status --json`\n' +
      'so you can ask Codex to summarize local HUD data. It will read metadata only —\n' +
      'never prompt bodies — and will not change Codex behavior silently.\n',
  );
  return 0;
}

export async function runHooksInstall(): Promise<number> {
  process.stdout.write(
    'codex-hud hooks: planned, not yet available.\n\n' +
      'A future release will optionally install Codex lifecycle hooks (only if Codex\n' +
      'supports them), with confirmation before any config change. Hooks will store\n' +
      'metadata only — never prompt bodies and never secrets.\n',
  );
  return 0;
}

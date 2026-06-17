import { buildSnapshot } from '../core/snapshot.js';
import { renderSnapshot } from '../tui/renderer.js';
import { readAppConfig } from '../config/appConfig.js';

export interface HookFlags {
  color?: boolean;
}

/**
 * Runtime handler invoked by Codex's UserPromptSubmit hook. Reads the hook JSON
 * from stdin, builds the HUD from the current session (transcript_path), and
 * emits it as a `systemMessage` so Codex shows it above each new prompt.
 *
 * Privacy: the `prompt` field on stdin is never read, stored, or logged.
 */
export async function runHook(flags: HookFlags): Promise<number> {
  const payload = await readStdinJson();
  const transcriptPath = strField(payload, 'transcript_path');
  const cwd = strField(payload, 'cwd');

  try {
    const appConfig = await readAppConfig();
    const snapshot = await buildSnapshot({
      projectPath: cwd,
      sessionPath: transcriptPath,
      skipCodexDetect: true,
    });
    const hud = renderSnapshot(snapshot, { config: appConfig, color: flags.color ?? true });
    process.stdout.write(JSON.stringify({ systemMessage: hud }) + '\n');
  } catch {
    // Never break the user's prompt submission because of the HUD.
    process.stdout.write('{}\n');
  }
  return 0;
}

async function readStdinJson(): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function strField(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

import { execa } from 'execa';
import type { CodexInstall } from '../types/codex.js';

/**
 * Detects the Codex CLI by running `codex --version`. Never throws; returns a
 * structured result so callers can degrade gracefully.
 */
export async function detectCodex(): Promise<CodexInstall> {
  try {
    const { stdout } = await execa('codex', ['--version'], { timeout: 5000 });
    return { found: true, version: parseVersion(stdout) };
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') return { found: false, error: 'codex not found on PATH' };
    return { found: false, error: e.message };
  }
}

function parseVersion(stdout: string): string {
  const match = stdout.match(/\d+\.\d+\.\d+\S*/);
  return match ? match[0] : stdout.trim();
}

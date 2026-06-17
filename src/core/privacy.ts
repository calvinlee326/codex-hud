import { resolve } from 'node:path';
import { codexConfigPath, codexHome, codexSessionsDir, appConfigDir } from './paths.js';
import { PrivacyViolationError } from './errors.js';

/**
 * Filenames within ~/.codex that must never be opened. These hold credentials
 * or auth state and are explicitly outside the allowlist.
 */
const DENIED_BASENAMES = new Set(['auth.json', 'credentials.json', '.env']);

/**
 * Returns true if `target` is a path codex-hud is permitted to read.
 * Allowed: the codex config file, anything under the sessions dir, project
 * `.codex/config.toml` files, and the app's own config dir.
 */
export function isReadAllowed(target: string, projectPath: string): boolean {
  const abs = resolve(target);
  const base = abs.split('/').pop() ?? '';
  if (DENIED_BASENAMES.has(base)) return false;

  const allowedExact = [codexConfigPath(), resolve(projectPath, '.codex', 'config.toml')];
  if (allowedExact.includes(abs)) return true;

  const allowedRoots = [resolve(codexSessionsDir()), resolve(appConfigDir())];
  return allowedRoots.some((root) => abs === root || abs.startsWith(root + '/'));
}

export function assertReadAllowed(target: string, projectPath: string): void {
  if (!isReadAllowed(target, projectPath)) {
    throw new PrivacyViolationError(`Refusing to read disallowed path: ${target}`);
  }
}

/** Paths codex-hud is permitted to write (setup/config only). */
export function isWriteAllowed(target: string): boolean {
  const abs = resolve(target);
  if (abs === codexConfigPath()) return true;
  if (abs.startsWith(resolve(codexHome()) + '/')) {
    // backups of config.toml live alongside it
    const base = abs.split('/').pop() ?? '';
    if (base.startsWith('config.toml.codex-hud.bak-')) return true;
  }
  return abs.startsWith(resolve(appConfigDir()) + '/') || abs === resolve(appConfigDir());
}

export const PRIVACY_STATEMENT =
  'local-only, no credentials read';

/** Human-readable disclosure used by `doctor`. */
export const DATA_DISCLOSURE = {
  reads: [
    '~/.codex/config.toml (and project .codex/config.toml)',
    '~/.codex/sessions/**/*.jsonl (metadata and counts only)',
    'git metadata of the current repository',
    'codex --version',
    "codex-hud's own config file",
  ],
  neverReads: [
    'auth.json, API keys, ChatGPT tokens, cookies, keychains',
    'environment secrets',
    'transcript message bodies (only counts and tool names are read)',
  ],
  network: 'none — codex-hud makes no network calls',
};

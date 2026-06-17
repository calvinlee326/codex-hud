import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export function codexHome(): string {
  return process.env.CODEX_HOME ?? join(homedir(), '.codex');
}

export function codexConfigPath(): string {
  return join(codexHome(), 'config.toml');
}

export function codexSessionsDir(): string {
  return join(codexHome(), 'sessions');
}

export function projectCodexConfigPath(projectPath: string): string {
  return join(projectPath, '.codex', 'config.toml');
}

export function appConfigDir(): string {
  const base = process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config');
  return join(base, 'codex-hud');
}

export function appConfigPath(): string {
  return join(appConfigDir(), 'config.json');
}

/** Render an absolute path as `~`-relative for privacy-safe display. */
export function tildify(p: string): string {
  const home = homedir();
  const abs = resolve(p);
  if (abs === home) return '~';
  if (abs.startsWith(home + '/')) return '~' + abs.slice(home.length);
  return abs;
}

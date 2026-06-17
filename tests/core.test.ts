import { describe, it, expect, afterEach, vi } from 'vitest';
import { contextWindowFor, estimateContextUsage } from '../src/core/contextWindow.js';
import { isReadAllowed, isWriteAllowed } from '../src/core/privacy.js';
import { tildify, codexConfigPath } from '../src/core/paths.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

describe('contextWindow', () => {
  it('maps known model families', () => {
    expect(contextWindowFor('gpt-5.5')).toBe(400_000);
    expect(contextWindowFor('unknown-model')).toBeUndefined();
  });

  it('prefers an explicit known window over the model table', () => {
    expect(estimateContextUsage({ total: 500 }, 'gpt-5.5', 1000)).toBe(0.5);
  });

  it('returns undefined when usage or window is missing', () => {
    expect(estimateContextUsage(undefined, 'gpt-5.5')).toBeUndefined();
    expect(estimateContextUsage({ total: 10 }, 'mystery')).toBeUndefined();
  });

  it('uses input tokens (context loaded), not cumulative totals', () => {
    // input is the prompt loaded into the window; output should not inflate it
    expect(estimateContextUsage({ input: 100, output: 900, total: 1000 }, undefined, 1000)).toBe(
      0.1,
    );
  });
});

describe('privacy allowlist', () => {
  const project = '/home/u/proj';

  it('allows the codex config and sessions, denies credentials', () => {
    expect(isReadAllowed(codexConfigPath(), project)).toBe(true);
    expect(isReadAllowed(join(homedir(), '.codex', 'sessions', 'a', 'b.jsonl'), project)).toBe(true);
    expect(isReadAllowed(join(homedir(), '.codex', 'auth.json'), project)).toBe(false);
  });

  it('allows project .codex/config.toml but not arbitrary paths', () => {
    expect(isReadAllowed(join(project, '.codex', 'config.toml'), project)).toBe(true);
    expect(isReadAllowed('/etc/passwd', project)).toBe(false);
  });

  it('permits writes only to config.toml, its backups, and app config', () => {
    expect(isWriteAllowed(codexConfigPath())).toBe(true);
    expect(isWriteAllowed(join(homedir(), '.codex', 'config.toml.codex-hud.bak-x'))).toBe(true);
    expect(isWriteAllowed('/etc/hosts')).toBe(false);
  });
});

describe('tildify', () => {
  it('renders home-relative paths', () => {
    expect(tildify(homedir())).toBe('~');
    expect(tildify(join(homedir(), 'x'))).toBe('~/x');
  });
});

describe('appConfig', () => {
  const env = { ...process.env };
  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...env };
  });

  it('reads defaults when absent and round-trips a written config', async () => {
    const { mkdtemp, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const dir = await mkdtemp(join(tmpdir(), 'codex-hud-app-'));
    process.env.XDG_CONFIG_HOME = dir;
    vi.resetModules();
    const mod = await import('../src/config/appConfig.js');

    expect(await mod.appConfigExists()).toBe(false);
    const cfg = mod.defaultConfig();
    cfg.refreshIntervalMs = 2000;
    await mod.writeAppConfig(cfg);
    expect(await mod.appConfigExists()).toBe(true);
    expect((await mod.readAppConfig()).refreshIntervalMs).toBe(2000);

    await rm(dir, { recursive: true, force: true });
  });
});

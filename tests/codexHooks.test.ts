import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  installPromptHook,
  uninstallPromptHook,
  isPromptHookInstalled,
  hookCommand,
} from '../src/core/codexHooks.js';

const dirs: string[] = [];
async function tmpHooks(content?: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'codex-hud-hooks-'));
  dirs.push(dir);
  const path = join(dir, 'hooks.json');
  if (content !== undefined) await writeFile(path, content, 'utf8');
  return path;
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe('hookCommand', () => {
  it('adds --no-color when color is off', () => {
    expect(hookCommand(true)).toBe('codex-hud hook');
    expect(hookCommand(false)).toBe('codex-hud hook --no-color');
  });
});

describe('installPromptHook', () => {
  it('creates hooks.json with a UserPromptSubmit command hook', async () => {
    const path = await tmpHooks();
    const result = await installPromptHook(hookCommand(true), path);
    expect(result).toBe('installed');

    const json = JSON.parse(await readFile(path, 'utf8'));
    const cmd = json.hooks.UserPromptSubmit[0].hooks[0];
    expect(cmd.type).toBe('command');
    expect(cmd.command).toBe('codex-hud hook');
    expect(await isPromptHookInstalled(path)).toBe(true);
  });

  it('merges with existing unrelated hooks and backs up', async () => {
    const existing = JSON.stringify({
      hooks: {
        UserPromptSubmit: [
          { hooks: [{ type: 'command', command: 'my-linter' }] },
        ],
        PreToolUse: [{ hooks: [{ type: 'command', command: 'guard' }] }],
      },
    });
    const path = await tmpHooks(existing);
    await installPromptHook(hookCommand(true), path);

    const json = JSON.parse(await readFile(path, 'utf8'));
    const commands = json.hooks.UserPromptSubmit.flatMap((g: { hooks: { command: string }[] }) =>
      g.hooks.map((h) => h.command),
    );
    expect(commands).toContain('my-linter');
    expect(commands).toContain('codex-hud hook');
    expect(json.hooks.PreToolUse).toBeDefined();

    const backups = (await readdir(join(path, '..'))).filter((f) => f.includes('.bak-'));
    expect(backups.length).toBe(1);
  });

  it('is idempotent for the same command', async () => {
    const path = await tmpHooks();
    await installPromptHook(hookCommand(true), path);
    expect(await installPromptHook(hookCommand(true), path)).toBe('already-installed');
  });

  it('updates the command when color flag changes', async () => {
    const path = await tmpHooks();
    await installPromptHook(hookCommand(true), path);
    await installPromptHook(hookCommand(false), path);
    const json = JSON.parse(await readFile(path, 'utf8'));
    const groups = json.hooks.UserPromptSubmit.filter((g: { hooks: { command: string }[] }) =>
      g.hooks.some((h) => h.command.includes('codex-hud hook')),
    );
    expect(groups.length).toBe(1);
    expect(groups[0].hooks[0].command).toBe('codex-hud hook --no-color');
  });
});

describe('uninstallPromptHook', () => {
  it('removes only the codex-hud hook, keeping others', async () => {
    const path = await tmpHooks(
      JSON.stringify({
        hooks: {
          UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'my-linter' }] }],
        },
      }),
    );
    await installPromptHook(hookCommand(true), path);
    const removed = await uninstallPromptHook(path);
    expect(removed).toBe(true);

    const json = JSON.parse(await readFile(path, 'utf8'));
    const commands = json.hooks.UserPromptSubmit.flatMap((g: { hooks: { command: string }[] }) =>
      g.hooks.map((h) => h.command),
    );
    expect(commands).toContain('my-linter');
    expect(commands).not.toContain('codex-hud hook');
  });

  it('returns false when nothing to remove', async () => {
    const path = await tmpHooks();
    expect(await uninstallPromptHook(path)).toBe(false);
  });
});

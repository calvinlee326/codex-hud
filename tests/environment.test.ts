import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gatherEnvironment } from '../src/core/environment.js';

const env = { ...process.env };
const dirs: string[] = [];

afterEach(async () => {
  process.env = { ...env };
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe('gatherEnvironment', () => {
  it('counts AGENTS.md (project + global), skills, and hooks', async () => {
    const home = await mkdtemp(join(tmpdir(), 'codex-hud-env-home-'));
    const project = await mkdtemp(join(tmpdir(), 'codex-hud-env-proj-'));
    dirs.push(home, project);
    process.env.CODEX_HOME = home;

    await writeFile(join(home, 'AGENTS.md'), '# global', 'utf8');
    await writeFile(join(project, 'AGENTS.md'), '# project', 'utf8');
    await mkdir(join(home, 'skills', 'one'), { recursive: true });
    await mkdir(join(home, 'skills', 'two'), { recursive: true });
    await writeFile(
      join(home, 'hooks.json'),
      JSON.stringify({
        hooks: {
          UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'a' }] }],
          PreToolUse: [{ hooks: [{ type: 'command', command: 'b' }, { type: 'command', command: 'c' }] }],
        },
      }),
      'utf8',
    );

    const result = await gatherEnvironment(project);
    expect(result.agentsMd).toBe(2);
    expect(result.skills).toBe(2);
    expect(result.hooks).toBe(3);
  });

  it('returns zeros when nothing is present', async () => {
    const home = await mkdtemp(join(tmpdir(), 'codex-hud-env-empty-'));
    const project = await mkdtemp(join(tmpdir(), 'codex-hud-env-eproj-'));
    dirs.push(home, project);
    process.env.CODEX_HOME = home;

    const result = await gatherEnvironment(project);
    expect(result).toEqual({ agentsMd: 0, skills: 0, hooks: 0 });
  });
});

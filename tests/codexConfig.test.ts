import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readCodexConfig, parseStatusLine } from '../src/core/codexConfig.js';
import { ConfigParseError } from '../src/core/errors.js';

const dirs: string[] = [];
async function tmpConfig(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'codex-hud-cfg-'));
  dirs.push(dir);
  const path = join(dir, 'config.toml');
  await writeFile(path, content, 'utf8');
  return path;
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe('readCodexConfig', () => {
  it('returns undefined when the file is absent', async () => {
    expect(await readCodexConfig('/no/such/config.toml')).toBeUndefined();
  });

  it('parses model and reasoning effort', async () => {
    const path = await tmpConfig('model = "gpt-5.5"\nmodel_reasoning_effort = "high"\n');
    const cfg = await readCodexConfig(path);
    expect(cfg?.model).toBe('gpt-5.5');
    expect(cfg?.modelReasoningEffort).toBe('high');
  });

  it('ignores invalid reasoning effort values', async () => {
    const path = await tmpConfig('model_reasoning_effort = "ludicrous"\n');
    const cfg = await readCodexConfig(path);
    expect(cfg?.modelReasoningEffort).toBeUndefined();
  });

  it('throws ConfigParseError on malformed TOML', async () => {
    const path = await tmpConfig('model = "unterminated\n');
    await expect(readCodexConfig(path)).rejects.toBeInstanceOf(ConfigParseError);
  });

  it('reads tui.status_line from a [tui] table', async () => {
    const path = await tmpConfig('[tui]\nstatus_line = ["model", "cwd"]\n');
    const cfg = await readCodexConfig(path);
    expect(cfg?.statusLine).toEqual({ kind: 'array', items: ['model', 'cwd'] });
  });
});

describe('parseStatusLine', () => {
  it('distinguishes absent, disabled, and array', () => {
    expect(parseStatusLine({})).toEqual({ kind: 'absent' });
    expect(parseStatusLine({ tui: { status_line: null } })).toEqual({ kind: 'disabled' });
    expect(parseStatusLine({ tui: { status_line: ['model'] } })).toEqual({
      kind: 'array',
      items: ['model'],
    });
  });

  it('supports the dotted-key form', () => {
    expect(parseStatusLine({ 'tui.status_line': ['cwd'] })).toEqual({
      kind: 'array',
      items: ['cwd'],
    });
  });
});

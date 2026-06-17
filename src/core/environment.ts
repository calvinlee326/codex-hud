import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { codexHome, codexHooksPath } from './paths.js';
import type { EnvironmentInfo } from '../types/app.js';

/**
 * Counts the local Codex assets shown in the HUD's context line: AGENTS.md docs
 * (project + global), installed skills, and configured hooks. Only existence and
 * counts are read — never file contents.
 */
export async function gatherEnvironment(projectPath: string): Promise<EnvironmentInfo> {
  const [agentsMd, skills, hooks] = await Promise.all([
    countAgents(projectPath),
    countSkills(),
    countHooks(),
  ]);
  return { agentsMd, skills, hooks };
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function countAgents(projectPath: string): Promise<number> {
  const candidates = [join(projectPath, 'AGENTS.md'), join(codexHome(), 'AGENTS.md')];
  const found = await Promise.all(candidates.map(exists));
  return found.filter(Boolean).length;
}

async function countSkills(): Promise<number> {
  try {
    const entries = await readdir(join(codexHome(), 'skills'), { withFileTypes: true });
    return entries.filter((e) => e.isDirectory() || e.name.endsWith('.md')).length;
  } catch {
    return 0;
  }
}

async function countHooks(): Promise<number> {
  try {
    const parsed = JSON.parse(await readFile(codexHooksPath(), 'utf8')) as {
      hooks?: Record<string, Array<{ hooks?: unknown[] }>>;
    };
    const groups = Object.values(parsed.hooks ?? {});
    return groups.reduce(
      (sum, event) => sum + event.reduce((n, g) => n + (g.hooks?.length ?? 0), 0),
      0,
    );
  } catch {
    return 0;
  }
}

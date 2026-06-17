import { readFile, mkdir } from 'node:fs/promises';
import { z } from 'zod';
import { appConfigDir, appConfigPath } from '../core/paths.js';
import { atomicWrite } from '../core/backup.js';
import type { AppConfig } from '../types/app.js';

const DEFAULT_CONFIG: AppConfig = {
  refreshIntervalMs: 1000,
  showEstimatedTokens: true,
  showGit: true,
  showTools: true,
  privacyMode: false,
};

const schema = z.object({
  refreshIntervalMs: z.number().int().positive().default(1000),
  showEstimatedTokens: z.boolean().default(true),
  showGit: z.boolean().default(true),
  showTools: z.boolean().default(true),
  privacyMode: z.boolean().default(false),
  sessionPathOverride: z.string().optional(),
  statusLineBackup: z
    .object({
      backupPath: z.string(),
      priorItems: z.array(z.string()).nullable(),
      appliedAt: z.string(),
    })
    .optional(),
});

export function defaultConfig(): AppConfig {
  return { ...DEFAULT_CONFIG };
}

/** Reads the app config, returning defaults if it is absent or invalid. */
export async function readAppConfig(): Promise<AppConfig> {
  let text: string;
  try {
    text = await readFile(appConfigPath(), 'utf8');
  } catch {
    return defaultConfig();
  }
  try {
    return schema.parse(JSON.parse(text));
  } catch {
    return defaultConfig();
  }
}

export async function writeAppConfig(config: AppConfig): Promise<void> {
  await mkdir(appConfigDir(), { recursive: true });
  await atomicWrite(appConfigPath(), JSON.stringify(config, null, 2) + '\n');
}

export async function appConfigExists(): Promise<boolean> {
  try {
    await readFile(appConfigPath(), 'utf8');
    return true;
  } catch {
    return false;
  }
}

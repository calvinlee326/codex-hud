import { readFile } from 'node:fs/promises';
import { readAppConfig, writeAppConfig, defaultConfig } from '../config/appConfig.js';
import { appConfigPath, codexConfigPath, tildify } from '../core/paths.js';
import { backupFile, atomicWrite, fileExists } from '../core/backup.js';

export type ConfigSub = 'show' | 'reset' | 'path';

export async function runConfig(sub: ConfigSub): Promise<number> {
  switch (sub) {
    case 'show': {
      const cfg = await readAppConfig();
      process.stdout.write(JSON.stringify(cfg, null, 2) + '\n');
      return 0;
    }
    case 'path': {
      process.stdout.write(appConfigPath() + '\n');
      return 0;
    }
    case 'reset':
      return resetConfig();
  }
}

async function resetConfig(): Promise<number> {
  const cfg = await readAppConfig();
  const backup = cfg.statusLineBackup;

  if (backup && (await fileExists(backup.backupPath))) {
    try {
      const original = await readFile(backup.backupPath, 'utf8');
      if (await fileExists(codexConfigPath())) await backupFile(codexConfigPath());
      await atomicWrite(codexConfigPath(), original);
      process.stdout.write(`Restored Codex config from ${tildify(backup.backupPath)}\n`);
    } catch (err) {
      process.stderr.write(`Could not restore Codex config: ${(err as Error).message}\n`);
      return 1;
    }
  } else {
    process.stdout.write('No statusline backup recorded — Codex config left unchanged.\n');
  }

  await writeAppConfig(defaultConfig());
  process.stdout.write('codex-hud config reset to defaults.\n');
  return 0;
}

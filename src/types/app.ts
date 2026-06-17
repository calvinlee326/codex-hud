import type { CodexInstall, CodexConfig } from './codex.js';
import type { SessionSummary } from './session.js';

export interface GitInfo {
  isRepo: boolean;
  branch?: string;
  dirty: boolean;
  ahead?: number;
  behind?: number;
}

export interface ProjectInfo {
  path: string;
  name: string;
  git: GitInfo;
}

export interface EnvironmentInfo {
  agentsMd: number;
  skills: number;
  hooks: number;
}

export interface HudSnapshot {
  codex: CodexInstall;
  config?: CodexConfig;
  project: ProjectInfo;
  session?: SessionSummary;
  environment?: EnvironmentInfo;
  generatedAt: Date;
}

export interface AppConfig {
  refreshIntervalMs: number;
  showEstimatedTokens: boolean;
  showGit: boolean;
  showTools: boolean;
  privacyMode: boolean;
  sessionPathOverride?: string;
  /** Reversibility metadata recorded by `setup`. */
  statusLineBackup?: {
    backupPath: string;
    /** The prior `tui.status_line` value, or null if it was absent. */
    priorItems: string[] | null;
    appliedAt: string;
  };
}

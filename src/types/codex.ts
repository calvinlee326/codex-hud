export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

export interface CodexInstall {
  found: boolean;
  version?: string;
  error?: string;
}

export interface CodexConfig {
  model?: string;
  modelReasoningEffort?: ReasoningEffort;
  planModeReasoningEffort?: string;
  statusLine: StatusLineSetting;
  raw: Record<string, unknown>;
  sourcePath: string;
}

/**
 * The `tui.status_line` value as found in config.toml.
 * - `array`: an ordered list of built-in item ids
 * - `disabled`: explicitly set to null
 * - `absent`: key not present (Codex default applies)
 */
export type StatusLineSetting =
  | { kind: 'array'; items: string[] }
  | { kind: 'disabled' }
  | { kind: 'absent' };

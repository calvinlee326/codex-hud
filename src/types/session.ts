export interface SessionMeta {
  id?: string;
  cwd?: string;
  cliVersion?: string;
  modelProvider?: string;
}

export interface TokenUsage {
  input?: number;
  output?: number;
  reasoning?: number;
  total?: number;
}

export interface ToolUseCount {
  name: string;
  count: number;
}

export interface SessionSummary {
  filePath: string;
  meta?: SessionMeta;
  model?: string;
  reasoningEffort?: string;
  startedAt?: Date;
  lastActivityAt?: Date;
  durationMs?: number;
  userMessageCount: number;
  agentMessageCount: number;
  toolCounts: ToolUseCount[];
  latestTokenUsage?: TokenUsage;
  modelContextWindow?: number;
  turnCount: number;
  linesRead: number;
  malformedLines: number;
  truncated: boolean;
}

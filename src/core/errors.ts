export class CodexNotFoundError extends Error {
  constructor(message = 'Codex CLI not found on PATH') {
    super(message);
    this.name = 'CodexNotFoundError';
  }
}

export class ConfigParseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ConfigParseError';
  }
}

export class ConfigWriteError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ConfigWriteError';
  }
}

export class BackupError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'BackupError';
  }
}

export class SessionReadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SessionReadError';
  }
}

export class PrivacyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrivacyViolationError';
  }
}

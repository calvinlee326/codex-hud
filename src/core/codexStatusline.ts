import type { StatusLineSetting } from '../types/codex.js';

/**
 * Built-in status line item ids known to be accepted by Codex. The exact set
 * varies by Codex version, so this is a conservative allowlist used only to
 * decide which items we may *add*. Unknown ids already present in the user's
 * config are always preserved (see planStatusLine).
 */
export const KNOWN_STATUS_ITEMS = [
  'model',
  'approval',
  'context_usage',
  'session_id',
  'sandbox',
  'cwd',
  'spinner',
] as const;

/** The items codex-hud wants present, in preferred order. */
export const DESIRED_CORE_ITEMS = ['model', 'context_usage', 'cwd'] as const;

export interface StatusLinePlan {
  current: string[] | null | 'absent';
  proposed: string[];
  changed: boolean;
}

/**
 * Computes a non-destructive status line plan: keeps every existing item (known
 * or unknown) in its current order, then appends any DESIRED_CORE_ITEMS that are
 * both missing and in the known allowlist. Never reorders or drops the user's
 * items.
 */
export function planStatusLine(current: StatusLineSetting): StatusLinePlan {
  const existing = current.kind === 'array' ? [...current.items] : [];
  const currentValue =
    current.kind === 'array' ? current.items : current.kind === 'disabled' ? null : 'absent';

  const proposed = [...existing];
  for (const item of DESIRED_CORE_ITEMS) {
    if (!proposed.includes(item) && (KNOWN_STATUS_ITEMS as readonly string[]).includes(item)) {
      proposed.push(item);
    }
  }

  const changed =
    current.kind !== 'array' ? proposed.length > 0 : !arraysEqual(existing, proposed);

  return { current: currentValue, proposed, changed };
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

const STATUS_LINE_RE = /^[ \t]*(?:tui\.status_line|status_line)[ \t]*=.*$/m;
const TUI_SECTION_RE = /^[ \t]*\[tui\][ \t]*$/m;

function formatArray(items: string[]): string {
  return `[${items.map((i) => `"${i}"`).join(', ')}]`;
}

/**
 * Surgically sets `tui.status_line` to `items` in the given config.toml text,
 * preserving comments and unrelated keys. Handles three cases: an existing
 * status_line line (replaced in place), an existing [tui] section (key inserted
 * right after the header), or neither (a dotted key appended).
 */
export function applyStatusLineEdit(tomlText: string, items: string[]): string {
  const assignment = `tui.status_line = ${formatArray(items)}`;

  if (STATUS_LINE_RE.test(tomlText)) {
    return tomlText.replace(STATUS_LINE_RE, (line) => {
      // Preserve dotted vs bare form based on the original line.
      const bare = /^[ \t]*status_line[ \t]*=/.test(line);
      return bare ? `status_line = ${formatArray(items)}` : assignment;
    });
  }

  if (TUI_SECTION_RE.test(tomlText)) {
    return tomlText.replace(TUI_SECTION_RE, (header) => `${header}\nstatus_line = ${formatArray(items)}`);
  }

  const sep = tomlText.length === 0 || tomlText.endsWith('\n') ? '' : '\n';
  return `${tomlText}${sep}${assignment}\n`;
}

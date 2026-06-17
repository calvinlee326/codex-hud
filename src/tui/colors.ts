const CODES = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
} as const;

export type ColorName = Exclude<keyof typeof CODES, 'reset'>;

export interface Palette {
  enabled: boolean;
  paint(text: string, ...styles: ColorName[]): string;
}

/**
 * Decides whether ANSI color should be emitted: honors an explicit flag, the
 * NO_COLOR convention, and TTY detection.
 */
export function colorEnabled(flag?: boolean): boolean {
  if (flag === false) return false;
  if (process.env.NO_COLOR) return false;
  if (flag === true) return true;
  return Boolean(process.stdout.isTTY);
}

export function createPalette(enabled: boolean): Palette {
  return {
    enabled,
    paint(text, ...styles) {
      if (!enabled || styles.length === 0) return text;
      const prefix = styles.map((s) => CODES[s]).join('');
      return `${prefix}${text}${CODES.reset}`;
    },
  };
}

import type { Bindings, LogEntry, LogLevel, LogType, Transport } from './types';

import { isLevelEnabled } from './types';

/* ─── Console theme types ─── */

/**
 * Per-level style definition for the console transport.
 * All fields are optional when providing a level override — unspecified fields fall back to the default theme.
 */
export type ConsoleThemeEntry = {
  badge: string;
  bg: string;
  border: string;
  color: string;
};

/**
 * Partial theme overrides merged on top of the default theme.
 * Each level entry is also partial — only specify the fields you want to change.
 *
 * @example
 * consoleTransport({ theme: { error: { badge: '✖' } } })
 */
export type ConsoleTheme = Partial<Record<LogType | 'group' | 'ns', Partial<ConsoleThemeEntry>>>;

/**
 * Fully-resolved console theme where every level and every field is populated.
 */
export type ResolvedTheme = Record<LogType | 'group' | 'ns', ConsoleThemeEntry>;

/* ─── ConsoleTransportOptions ─── */

export type ConsoleTransportOptions = {
  /**
   * Enable ANSI 24-bit color output in Node.js.
   * Default: true when process.stdout.isTTY is true, false otherwise.
   */
  ansi?: boolean;
  /**
   * Object serialization format for Node.js output.
   * - 'json' — JSON.stringify (machine-readable, fails on circular refs)
   * - 'raw' — pass the object directly to the console method (default)
   * Default: 'raw'.
   */
  format?: 'json' | 'raw';
  /**
   * Custom object inspector function. When provided, the `data` object is
   * passed through this function before being written to the console.
   */
  inspectFn?: (value: unknown) => string;
  /** Minimum level to output. Default: 'debug'. */
  level?: LogLevel;
  /** Partial theme overrides merged on top of the default theme. */
  theme?: ConsoleTheme;
  /** Whether to include timestamp in console output. Default: true. */
  timestamp?: boolean;
};

/* ─── Payload builder ─── */

function buildPayload(
  data: Readonly<Bindings>,
  message: string | undefined,
  inspectFn: ((v: unknown) => string) | undefined,
): unknown[] {
  const hasData = Object.keys(data).length > 0;
  const formatted: unknown = inspectFn && hasData ? inspectFn(data) : hasData ? data : undefined;

  if (formatted !== undefined && message !== undefined) return [message, formatted];

  if (formatted !== undefined) return [formatted];

  if (message !== undefined) return [message];

  return [];
}

/* ─── Console theme ─── */

export const DEFAULT_THEME: ResolvedTheme = {
  debug: { badge: '🅳', bg: '#616161', border: '#424242', color: '#e0e0e0' },
  error: { badge: '🅴', bg: '#d32f2f', border: '#c62828', color: '#fff' },
  fatal: { badge: '🅵', bg: '#4a148c', border: '#38006b', color: '#fff' },
  group: { badge: '🅶', bg: '#546e7a', border: '#455a64', color: '#fff' },
  info: { badge: '🅸', bg: '#1976d2', border: '#1565c0', color: '#fff' },
  ns: { badge: '', bg: '#424242', border: '#212121', color: '#fff' },
  warn: { badge: '🆆', bg: '#ffb300', border: '#ffa000', color: '#212121' },
};

const NS_STYLE = 'border-radius: 8px; font: italic small-caps bold 12px; font-weight: lighter; padding: 0 4px;';

const LOG_METHOD: Record<LogType, 'error' | 'info' | 'log' | 'warn'> = {
  debug: 'log',
  error: 'error',
  fatal: 'error',
  info: 'info',
  warn: 'warn',
};

/** Deep-merges per-level overrides onto the default theme. Only specified fields within each level entry are replaced. */
export function resolveTheme(override: ConsoleTheme | undefined): ResolvedTheme {
  if (!override) return DEFAULT_THEME;

  const result: ResolvedTheme = { ...DEFAULT_THEME };

  for (const key of Object.keys(override) as Array<LogType | 'group' | 'ns'>) {
    const entry = override[key];

    if (entry) result[key] = { ...DEFAULT_THEME[key], ...entry };
  }

  return result;
}

/* ─── ANSI helpers (Node) ─── */

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function ansiColor(hex: string, text: string): string {
  const [r, g, b] = hexToRgb(hex);

  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}

function ansiMuted(text: string): string {
  return `\x1b[90m${text}\x1b[0m`;
}

function supportsAnsi(): boolean {
  if (typeof window !== 'undefined') return false;

  return (
    (globalThis as Record<string, unknown> & { process?: { stdout?: { isTTY?: boolean } } }).process?.stdout?.isTTY ===
    true
  );
}

function badgeStyle(entry: ConsoleThemeEntry, extra = ''): string {
  return `background: ${entry.bg}; color: ${entry.color}; border: 1px solid ${entry.border}; border-radius: 4px; padding: 0 1px${extra}`;
}

function escapeConsoleFormat(s: string): string {
  return s.replace(/%/g, '%%');
}

/**
 * Builds the Node console prefix string, passed as the first argument to `console.log()`/etc.
 * alongside the payload. `namespace` is escaped because Node's `console.*` methods run the first
 * string argument through `util.format` — an unescaped `%s`/`%d`/`%o`/etc. in a caller-controlled
 * namespace would consume and hide the actual payload arguments that follow (log forging).
 */
function buildNodePrefix(
  theme: ResolvedTheme,
  type: LogType,
  namespace: string,
  timestamp: string,
  useAnsi: boolean,
): string {
  const t = theme[type];
  const safeBadge = escapeConsoleFormat(t.badge);
  const badgeText = useAnsi ? ansiColor(t.bg, safeBadge) : safeBadge;
  const meta = [badgeText];

  if (namespace) {
    const safeNamespace = escapeConsoleFormat(namespace);

    meta.push(useAnsi ? ansiMuted(`[${safeNamespace}]`) : `[${safeNamespace}]`);
  }

  if (timestamp) meta.push(useAnsi ? ansiMuted(timestamp) : timestamp);

  return `${meta.join(' | ')} |`;
}

function buildBrowserPrefix(
  theme: ResolvedTheme,
  type: LogType,
  namespace: string,
  timestamp: string,
): { fmt: string; parts: string[] } {
  let fmt = `%c${escapeConsoleFormat(theme[type].badge)}%c`;
  const parts: string[] = [badgeStyle(theme[type]), ''];

  if (namespace) {
    fmt += ` %c${escapeConsoleFormat(namespace)}%c`;
    parts.push(badgeStyle(theme.ns, `; ${NS_STYLE}`), '');
  }

  if (timestamp) {
    fmt += ` %c${timestamp}%c`;
    parts.push('color: gray', '');
  }

  return { fmt, parts };
}

/* ─── consoleTransport ─── */

/**
 * Formats and writes log entries to the browser or Node.js console.
 * Uses CSS-styled badges in browsers and plain text in Node.
 * Accepts an optional partial `theme` to override colors and badges per level.
 *
 * @example
 * consoleTransport()
 * consoleTransport({ level: 'warn', timestamp: false })
 * consoleTransport({ theme: { error: { badge: '✖' } } })
 * consoleTransport({ inspectFn: (v) => require('util').inspect(v, { colors: true, depth: 4 }) })
 */
export function consoleTransport(options: ConsoleTransportOptions = {}): Transport {
  const level = options.level ?? 'debug';
  const showTimestamp = options.timestamp ?? true;
  const format = options.format ?? 'raw';
  const isNode = typeof window === 'undefined';
  const useAnsi = options.ansi ?? (isNode ? supportsAnsi() : false);
  const resolved = resolveTheme(options.theme);
  const inspectFn: ((v: unknown) => string) | undefined =
    format === 'json' ? (v) => JSON.stringify(v) : options.inspectFn;

  return (entry: LogEntry): void => {
    if (!isLevelEnabled(level, entry.level)) return;

    const timestamp = showTimestamp ? entry.timestamp.toISOString().slice(11, 23) : '';
    const payload = buildPayload(entry.data, entry.message, inspectFn);
    const method = console[LOG_METHOD[entry.level]] as (...args: unknown[]) => void;

    if (isNode) {
      method(buildNodePrefix(resolved, entry.level, entry.namespace, timestamp, useAnsi), ...payload);
    } else {
      const { fmt, parts } = buildBrowserPrefix(resolved, entry.level, entry.namespace, timestamp);

      method(fmt, ...parts, ...payload);
    }
  };
}

/* ─── Group rendering (used by logger.ts wrapGroup) ─── */

export function renderGroup(collapsed: boolean, label: string, namespace: string, theme: ResolvedTheme): void {
  const fn = collapsed ? console.groupCollapsed : console.group;
  const isNode = typeof window === 'undefined';

  if (isNode) {
    const meta = [theme.group.badge, label];

    if (namespace) meta.push(`[${namespace}]`);

    fn(meta.join(' | '));

    return;
  }

  let fmt = `${theme.group.badge} %c${escapeConsoleFormat(label)}%c`;
  const parts: string[] = [badgeStyle(theme.group, '; margin-right: 6px; padding: 1px 3px 0'), ''];

  if (namespace) {
    fmt += ` %c${escapeConsoleFormat(namespace)}%c`;
    parts.push(badgeStyle(theme.ns, `; ${NS_STYLE}; margin-right: 6px`), '');
  }

  fn(fmt, ...parts);
}

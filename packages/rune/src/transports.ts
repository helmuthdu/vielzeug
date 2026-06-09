import type {
  BatchTransport,
  BatchTransportOptions,
  Bindings,
  ConsoleTheme,
  ConsoleThemeEntry,
  ConsoleTransportOptions,
  JsonTransportOptions,
  LogEntry,
  LogType,
  PipeOptions,
  RedactTransportOptions,
  RemoteLogData,
  RemoteTransportOptions,
  ResolvedTheme,
  SampleTransportOptions,
  Transport,
} from './types';

import { isLevelEnabled } from './types';

/* ─── Context merge ─── */

function mergeContext(bindings: Readonly<Bindings>, context: Bindings | undefined): Bindings | undefined {
  const hasBound = Object.keys(bindings).length > 0;

  if (!hasBound && !context) return undefined;

  return { ...bindings, ...context };
}

function buildPayload(
  ctx: Bindings | undefined,
  message: string | undefined,
  inspectFn: ((v: unknown) => string) | undefined,
): unknown[] {
  const formatted: unknown = inspectFn && ctx ? inspectFn(ctx) : ctx;

  if (formatted !== undefined && message !== undefined) return [message, formatted];

  if (formatted !== undefined) return [formatted];

  if (message !== undefined) return [message];

  return [];
}

/* ─── Environment detection ─── */

export function detectEnv(): 'development' | 'production' {
  if (typeof window === 'undefined') {
    return (globalThis as Record<string, unknown> & { process?: { env?: { NODE_ENV?: string } } }).process?.env
      ?.NODE_ENV === 'production'
      ? 'production'
      : 'development';
  }

  return (import.meta as ImportMeta & { env?: { PROD?: boolean } }).env?.PROD ? 'production' : 'development';
}

/* ─── Console transport internals ─── */

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

function buildNodePrefix(
  theme: ResolvedTheme,
  type: LogType,
  namespace: string,
  timestamp: string,
  useAnsi: boolean,
): string {
  const t = theme[type];
  const badgeText = useAnsi ? ansiColor(t.bg, t.badge) : t.badge;
  const meta = [badgeText];

  if (namespace) meta.push(useAnsi ? ansiMuted(`[${namespace}]`) : `[${namespace}]`);

  if (timestamp) meta.push(useAnsi ? ansiMuted(timestamp) : timestamp);

  return `${meta.join(' | ')} |`;
}

function escapeConsoleFormat(s: string): string {
  return s.replace(/%/g, '%%');
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
 * This is the default transport when no transports are configured.
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
  // Resolve theme once at factory time — it never changes per transport instance
  const resolved = resolveTheme(options.theme);
  // json format: wrap ctx through JSON.stringify; inspectFn: use the provided function
  const inspectFn: ((v: unknown) => string) | undefined =
    format === 'json' ? (v) => JSON.stringify(v) : options.inspectFn;

  return (entry: LogEntry): void => {
    if (!isLevelEnabled(level, entry.level)) return;

    const timestamp = showTimestamp ? entry.timestamp.toISOString().slice(11, 23) : '';
    const merged = mergeContext(entry.bindings, entry.context);
    const payload = buildPayload(merged, entry.message, inspectFn);
    const method = console[LOG_METHOD[entry.level]] as (...args: unknown[]) => void;

    if (isNode) {
      method(buildNodePrefix(resolved, entry.level, entry.namespace, timestamp, useAnsi), ...payload);
    } else {
      const { fmt, parts } = buildBrowserPrefix(resolved, entry.level, entry.namespace, timestamp);

      method(fmt, ...parts, ...payload);
    }
  };
}

/** Module-level default transport singleton — avoids repeated ANSI detection on every createLogger() call. */
export const DEFAULT_TRANSPORT: Transport = consoleTransport();

/* ─── Group rendering (exported for logger.ts wrapGroup) ─── */

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

/* ─── remoteTransport ─── */

export type { RemoteLogData };

/**
 * Forwards log entries asynchronously to a remote handler.
 * The handler is fire-and-forget. Use onError to observe delivery failures.
 * Console and remote thresholds are fully independent.
 *
 * **Security note:** serialized `Error` objects include the full `stack` trace,
 * which may expose internal file paths. Use `redactTransport` or a middleware
 * to strip `err.stack` before forwarding in production if this is a concern.
 *
 * @example
 * remoteTransport({
 *   handler: async (type, data) => {
 *     await fetch('/api/logs', { body: JSON.stringify(data), method: 'POST' });
 *   },
 *   level: 'error',
 * })
 */
export function remoteTransport(options: RemoteTransportOptions): Transport {
  const { handler } = options;
  const level = options.level ?? 'debug';
  const env = options.env ?? detectEnv();
  const onError = options.onError ?? ((err: unknown) => console.warn('[rune] remote transport error:', err));

  return (entry: LogEntry): void => {
    if (!isLevelEnabled(level, entry.level)) return;

    const merged = mergeContext(entry.bindings, entry.context);
    const data: RemoteLogData = {
      context: merged,
      env,
      level: entry.level,
      message: entry.message,
      namespace: entry.namespace || undefined,
      timestamp: entry.timestamp.toISOString(),
    };

    Promise.resolve()
      .then(() => handler(entry.level, data))
      .catch((err: unknown) => onError(err, data));
  };
}

/* ─── jsonTransport ─── */

function makeCircularReplacer(): (_key: string, value: unknown) => unknown {
  const seen = new WeakSet();

  return (_key: string, value: unknown): unknown => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';

      seen.add(value);
    }

    return value;
  };
}

/**
 * Writes newline-delimited JSON (NDJSON) to stdout or a custom output function.
 * Useful for structured log aggregation pipelines in Node.js (ELK, Datadog, etc.).
 *
 * @example
 * jsonTransport({ level: 'info' })
 * jsonTransport({ safe: true }) // handles circular references gracefully
 * jsonTransport({ output: (line) => fs.appendFileSync('app.log', line + '\n') })
 */
export function jsonTransport(options: JsonTransportOptions = {}): Transport {
  const level = options.level ?? 'debug';
  const f = options.fields ?? {};
  const fLevel = f.level ?? 'level';
  const fTime = f.time ?? 'time';
  const fNs = f.ns ?? 'ns';
  const fMsg = f.msg ?? 'msg';
  const safe = options.safe ?? false;
  const output =
    options.output ??
    ((line: string) => {
      (
        globalThis as Record<string, unknown> & { process?: { stdout?: { write: (s: string) => void } } }
      ).process?.stdout?.write(line + '\n');
    });

  return (entry: LogEntry): void => {
    if (!isLevelEnabled(level, entry.level)) return;

    const merged = mergeContext(entry.bindings, entry.context);
    const record: Record<string, unknown> = {
      ...merged,
      [fLevel]: entry.level,
      [fTime]: entry.timestamp.toISOString(),
      ...(entry.namespace && { [fNs]: entry.namespace }),
      ...(entry.message !== undefined && { [fMsg]: entry.message }),
    };

    output(JSON.stringify(record, safe ? makeCircularReplacer() : undefined));
  };
}

/* ─── batchTransport ─── */

/**
 * Buffers log entries and flushes them in batches, reducing I/O overhead.
 * Flushes when the buffer reaches maxSize or after the interval elapses.
 *
 * The returned transport has additional `.flush()` and `.dispose()` methods:
 * - `.flush()` — immediately send buffered entries without stopping the timer
 * - `.dispose()` — stop the interval and flush remaining entries (call on shutdown)
 *
 * Use `onFlushError` to observe or retry failed flushes (e.g. dead-letter queue).
 *
 * @example
 * const batch = batchTransport({
 *   onFlush: (entries) => sendToCollector(entries),
 *   onFlushError: (entries, err) => deadLetter.push(entries),
 *   interval: 10_000,
 *   maxSize: 100,
 * });
 * batch.dispose(); // call on app shutdown
 */
export function batchTransport(options: BatchTransportOptions): BatchTransport {
  const level = options.level ?? 'debug';
  const maxSize = options.maxSize ?? 50;
  const maxBuffer = options.maxBuffer;
  const interval = options.interval ?? 5000;

  let buffer: LogEntry[] = [];
  let timer: ReturnType<typeof setInterval> | undefined;

  function flush(): void {
    if (buffer.length === 0) return;

    const entries = buffer;

    buffer = [];

    Promise.resolve()
      .then(() => options.onFlush(entries))
      .catch((err: unknown) => options.onFlushError?.(entries, err));
  }

  const transport = Object.assign(
    (entry: LogEntry): void => {
      if (!isLevelEnabled(level, entry.level)) return;

      if (!timer) timer = setInterval(flush, interval);

      buffer.push(entry);

      if (maxBuffer !== undefined && buffer.length > maxBuffer) {
        buffer = buffer.slice(buffer.length - maxBuffer);
      }

      if (buffer.length >= maxSize) flush();
    },
    {
      dispose(): void {
        if (timer) {
          clearInterval(timer);
          timer = undefined;
        }

        flush();
      },
      flush,
    },
  );

  return transport;
}

/* ─── sampleTransport ─── */

/**
 * Probabilistically forwards entries to a downstream transport.
 * Useful for reducing volume of high-frequency debug logs in production.
 *
 * For sampling at the emit level (skipping middleware + all transports),
 * use the `sample` option on `createLogger` instead — it's more efficient.
 *
 * @example
 * sampleTransport({ rate: 0.1, transport: remoteTransport({ handler }) })
 */
export function sampleTransport(options: SampleTransportOptions): Transport {
  const { rate, transport } = options;
  const level = options.level ?? 'debug';

  return (entry: LogEntry): void => {
    if (!isLevelEnabled(level, entry.level)) return;

    if (Math.random() < rate) transport(entry);
  };
}

/* ─── redactTransport ─── */

/**
 * Strips sensitive fields from bindings and context before forwarding to a downstream transport.
 * Redaction is applied recursively at any depth, including inside arrays.
 *
 * @example
 * redactTransport({
 *   keys: ['password', 'token', 'ssn'],
 *   replacement: '[REDACTED]',
 *   transport: remoteTransport({ handler }),
 * })
 */
export function redactTransport(options: RedactTransportOptions): Transport {
  const { keys, replacement = '[REDACTED]', transport } = options;

  for (const key of keys) {
    if (key.includes('.')) {
      console.warn(
        `[rune] redactTransport: key "${key}" contains a dot. Dot-path notation is not supported — use the plain field name (e.g. 'password') to redact at any depth.`,
      );
    }
  }

  const keySet = new Set(keys);

  function redactValue(v: unknown, depth = 0): unknown {
    if (depth > 20) return v;

    if (Array.isArray(v)) return v.map((item) => redactValue(item, depth + 1));

    if (typeof v === 'object' && v !== null) return redactObject(v as Bindings, depth + 1);

    return v;
  }

  function redactObject(obj: Bindings, depth = 0): Bindings {
    const result: Bindings = {};

    for (const [k, v] of Object.entries(obj)) {
      result[k] = keySet.has(k) ? replacement : redactValue(v, depth);
    }

    return result;
  }

  return (entry: LogEntry): void => {
    const redacted: LogEntry = {
      ...entry,
      bindings: Object.keys(entry.bindings).length > 0 ? redactObject(entry.bindings as Bindings) : entry.bindings,
      context: entry.context ? redactObject(entry.context) : undefined,
    };

    transport(redacted);
  };
}

/* ─── pipe — fault-tolerant fan-out ─── */

/**
 * Fan-out: dispatches each entry to all provided transports independently.
 * A throw in one transport does not prevent others from receiving the entry.
 * Pass `onError` to observe individual transport failures; without it, errors are silently swallowed.
 *
 * @example
 * createLogger({
 *   transports: [pipe(consoleTransport(), remoteTransport({ handler }))],
 * })
 *
 * // With error observer:
 * pipe({ onError: (err) => console.error('[pipe]', err) }, consoleTransport(), remoteTransport({ handler }))
 */
export function pipe(...transports: Transport[]): Transport;
export function pipe(options: PipeOptions, ...transports: Transport[]): Transport;
export function pipe(optionsOrTransport: PipeOptions | Transport, ...rest: Transport[]): Transport {
  let opts: PipeOptions;
  let transports: Transport[];

  if (typeof optionsOrTransport === 'function') {
    opts = {};
    transports = [optionsOrTransport, ...rest];
  } else {
    opts = optionsOrTransport;
    transports = rest;
  }

  return (entry: LogEntry): void => {
    for (const t of transports) {
      try {
        t(entry);
      } catch (err) {
        opts.onError?.(err, entry);
      }
    }
  };
}

import type {
  BatchTransport,
  BatchTransportOptions,
  Bindings,
  ConsoleTransportOptions,
  JsonTransportOptions,
  LogEntry,
  LogLevel,
  LogType,
  RedactTransportOptions,
  RemoteHandler,
  RemoteLogData,
  RemoteTransportOptions,
  SampleTransportOptions,
  Transport,
  Variant,
} from './types';

/* ─── Shared level priority ─── */

export const PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  error: 3,
  fatal: 4,
  info: 1,
  off: 5,
  warn: 2,
};

export function passes(threshold: LogLevel, level: LogType): boolean {
  return PRIORITY[threshold] <= PRIORITY[level];
}

/* ─── Context merge ─── */

function mergeContext(bindings: Readonly<Bindings>, context: Bindings | undefined): Bindings | undefined {
  const hasBound = Object.keys(bindings).length > 0;

  if (!hasBound && !context) return undefined;

  return { ...bindings, ...context };
}

function buildPayload(ctx: Bindings | undefined, message: string | undefined): unknown[] {
  if (ctx && message !== undefined) return [ctx, message];

  if (ctx) return [ctx];

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

const IS_NODE = typeof window === 'undefined';

/* ─── Console transport internals ─── */

type Theme = { bg: string; border: string; color: string; icon?: string; symbol?: string };

const THEME: Record<LogType | 'group' | 'ns', Theme> = {
  debug: { bg: '#616161', border: '#424242', color: '#fff', icon: '☕', symbol: '🅳' },
  error: { bg: '#d32f2f', border: '#c62828', color: '#fff', icon: '✘', symbol: '🅴' },
  fatal: { bg: '#4a148c', border: '#38006b', color: '#fff', icon: '💀', symbol: '🅵' },
  group: { bg: '#546e7a', border: '#455a64', color: '#fff', icon: '⚭', symbol: '🅶' },
  info: { bg: '#1976d2', border: '#1565c0', color: '#fff', icon: 'ℹ', symbol: '🅸' },
  ns: { bg: '#424242', border: '#212121', color: '#fff' },
  warn: { bg: '#ffb300', border: '#ffa000', color: '#fff', icon: '⚠', symbol: '🆆' },
};

const NS_STYLE = 'border-radius: 8px; font: italic small-caps bold 12px; font-weight: lighter; padding: 0 4px;';

const LOG_METHOD: Record<LogType, 'error' | 'info' | 'log' | 'warn'> = {
  debug: 'log',
  error: 'error',
  fatal: 'error',
  info: 'info',
  warn: 'warn',
};

function badge(type: LogType | 'group', variant: Variant): string {
  const theme = THEME[type];

  if (variant === 'text' || !theme[variant]) return type.toUpperCase();

  return theme[variant]!;
}

function badgeStyle(type: LogType | 'group' | 'ns', variant: Variant, extra = ''): string {
  const { bg, border, color } = THEME[type];
  const base = `border: 1px solid ${border}; border-radius: 4px`;

  switch (variant) {
    case 'icon':
      return `color: ${bg}; ${base}; padding: 0 3px${extra}`;
    case 'symbol':
      return `color: ${bg}; ${base}; padding: 0 1px${extra}`;
    default:
      return `background: ${bg}; color: ${color}; ${base}; font-weight: bold; padding: 0 3px${extra}`;
  }
}

function buildNodePrefix(type: LogType, namespace: string, timestamp: string, variant: Variant): string {
  const meta = [badge(type, variant)];

  if (namespace) meta.push(`[${namespace}]`);

  if (timestamp) meta.push(timestamp);

  return `${meta.join(' | ')} |`;
}

function buildBrowserPrefix(
  type: LogType,
  namespace: string,
  timestamp: string,
  variant: Variant,
): { fmt: string; parts: string[] } {
  let fmt = `%c${badge(type, variant)}%c`;
  const parts: string[] = [badgeStyle(type, variant), ''];

  if (namespace) {
    fmt += ` %c${namespace}%c`;
    parts.push(badgeStyle('ns', variant, `; ${NS_STYLE}`), '');
  }

  if (timestamp) {
    fmt += ` %c${timestamp}%c`;
    parts.push('color: gray', '');
  }

  return { fmt, parts };
}

/* ─── consoleTransport marker ─── */

/** Runtime symbol used to identify consoleTransport instances for group() gating. */
export const CONSOLE_TRANSPORT_MARKER = Symbol.for('rune.consoleTransport');

/* ─── consoleTransport ─── */

/**
 * Formats and writes log entries to the browser or Node.js console.
 * Uses CSS-styled badges in browsers and plain text in Node.
 * This is the default transport when no transports are configured.
 */
export function consoleTransport(options: ConsoleTransportOptions = {}): Transport {
  const level = options.level ?? 'debug';
  const showTimestamp = options.timestamp ?? true;
  const variant = options.variant ?? 'symbol';

  function transport(entry: LogEntry): void {
    if (!passes(level, entry.level)) return;

    const timestamp = showTimestamp ? entry.timestamp.toISOString().slice(11, 23) : '';
    const merged = mergeContext(entry.bindings, entry.context);
    const payload = buildPayload(merged, entry.message);
    const method = console[LOG_METHOD[entry.level]] as (...args: unknown[]) => void;

    if (IS_NODE) {
      method(buildNodePrefix(entry.level, entry.namespace, timestamp, variant), ...payload);
    } else {
      const { fmt, parts } = buildBrowserPrefix(entry.level, entry.namespace, timestamp, variant);

      method(fmt, ...parts, ...payload);
    }
  }

  (transport as unknown as Record<symbol, unknown>)[CONSOLE_TRANSPORT_MARKER] = true;

  return transport;
}

/* ─── remoteTransport ─── */

export type { RemoteHandler, RemoteLogData };

/**
 * Forwards log entries asynchronously to a remote handler.
 * The handler is fire-and-forget: errors are swallowed to a console.warn.
 * Console and remote thresholds are fully independent.
 *
 * @example
 * remoteTransport(async (type, data) => {
 *   await fetch('/api/logs', { body: JSON.stringify(data), method: 'POST' });
 * }, { level: 'error' })
 */
export function remoteTransport(handler: RemoteHandler, options: RemoteTransportOptions = {}): Transport {
  const level = options.level ?? 'debug';
  const env = options.env ?? detectEnv();

  return (entry: LogEntry): void => {
    if (!passes(level, entry.level)) return;

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
      .catch((err: unknown) => {
        console.warn('[rune] remote transport error:', err);
      });
  };
}

/* ─── jsonTransport ─── */

/**
 * Writes newline-delimited JSON (NDJSON) to stdout or a custom output function.
 * Useful for structured log aggregation pipelines in Node.js (ELK, Datadog, etc.).
 *
 * @example
 * jsonTransport({ level: 'info' })
 * jsonTransport({ output: (line) => fs.appendFileSync('app.log', line + '\n') })
 */
export function jsonTransport(options: JsonTransportOptions = {}): Transport {
  const level = options.level ?? 'debug';
  const output =
    options.output ??
    ((line: string) => {
      (
        globalThis as Record<string, unknown> & { process?: { stdout?: { write: (s: string) => void } } }
      ).process?.stdout?.write(line + '\n');
    });

  return (entry: LogEntry): void => {
    if (!passes(level, entry.level)) return;

    const merged = mergeContext(entry.bindings, entry.context);
    const record: Record<string, unknown> = {
      level: entry.level,
      time: entry.timestamp.toISOString(),
      ...(entry.namespace && { ns: entry.namespace }),
      ...(entry.message !== undefined && { msg: entry.message }),
      ...merged,
    };

    output(JSON.stringify(record));
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
 * @example
 * const batch = batchTransport({
 *   onFlush: (entries) => sendToCollector(entries),
 *   interval: 10_000,
 *   level: 'warn',
 *   maxSize: 100,
 * });
 * // on app shutdown:
 * batch.dispose();
 */
export function batchTransport(options: BatchTransportOptions): BatchTransport {
  const level = options.level ?? 'debug';
  const maxSize = options.maxSize ?? 50;
  const interval = options.interval ?? 5000;

  let buffer: LogEntry[] = [];
  let timer: ReturnType<typeof setInterval> | undefined;

  function flush(): void {
    if (buffer.length === 0) return;

    const entries = buffer;

    buffer = [];
    options.onFlush(entries);
  }

  const transport = Object.assign(
    (entry: LogEntry): void => {
      if (!passes(level, entry.level)) return;

      if (!timer) timer = setInterval(flush, interval);

      buffer.push(entry);

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
 * @example
 * sampleTransport({ rate: 0.1, transport: remoteTransport(handler) })
 * // forwards ~10% of entries
 */
export function sampleTransport(options: SampleTransportOptions): Transport {
  const { rate, transport } = options;

  return (entry: LogEntry): void => {
    if (Math.random() < rate) transport(entry);
  };
}

/* ─── redactTransport ─── */

/**
 * Strips sensitive fields from bindings and context before forwarding to a downstream transport.
 * Redaction is applied recursively at any depth.
 *
 * @example
 * redactTransport({
 *   keys: ['password', 'token', 'ssn'],
 *   replacement: '[REDACTED]',
 *   transport: remoteTransport(handler),
 * })
 */
export function redactTransport(options: RedactTransportOptions): Transport {
  const { keys, replacement = '[REDACTED]', transport } = options;
  const keySet = new Set(keys);

  function redactObject(obj: Bindings): Bindings {
    const result: Bindings = {};

    for (const [k, v] of Object.entries(obj)) {
      if (keySet.has(k)) {
        result[k] = replacement;
      } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        result[k] = redactObject(v as Bindings);
      } else {
        result[k] = v;
      }
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

/* ─── Group rendering (exported for logger.ts wrapGroup) ─── */

export function renderGroup(collapsed: boolean, label: string, namespace: string): void {
  const fn = collapsed ? console.groupCollapsed : console.group;

  if (IS_NODE) {
    const meta = [badge('group', 'symbol'), label];

    if (namespace) meta.push(`[${namespace}]`);

    fn(meta.join(' | '));

    return;
  }

  let fmt = `%c${label}%c`;
  const parts: string[] = [badgeStyle('group', 'symbol', '; margin-right: 6px; padding: 1px 3px 0'), ''];

  if (namespace) {
    fmt += ` %c${namespace}%c`;
    parts.push(badgeStyle('ns', 'symbol', `; ${NS_STYLE}; margin-right: 6px`), '');
  }

  fn(fmt, ...parts);
}

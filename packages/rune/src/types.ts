/* ─── Log levels ─── */

export type LogType = 'debug' | 'error' | 'fatal' | 'info' | 'warn';
export type LogLevel = LogType | 'off';

/** Numeric priority for each level. Lower = more verbose. Exported for transport authors. */
export const PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  error: 3,
  fatal: 4,
  info: 1,
  off: 5,
  warn: 2,
};

/** Returns true if `level` passes the `threshold`. Returns false when `level` is 'off'. Exported for transport authors. */
export function isLevelEnabled(threshold: LogLevel, level: LogLevel): boolean {
  if (level === 'off') return false;

  return PRIORITY[threshold] <= PRIORITY[level];
}

/* ─── Bindings ─── */

export type Bindings = Record<string, unknown>;

/* ─── Log entry ─── */

/**
 * The structured record produced by every log call and dispatched to all transports.
 * `data` is the merged result of pinned bindings and per-call context — transports
 * receive a single flat object and do not need to merge anything themselves.
 * Any `Error` instances — whether from a pinned binding (`bindings`/`withBindings()`) or
 * per-call context — are automatically serialized to `{ message, name, stack }`.
 * **Shallow only** — an `Error` nested inside a plain object (e.g. `{ meta: { err } }`) is left as-is;
 * only top-level fields of `data` are checked.
 */
export type LogEntry = {
  /**
   * Merged structured data: pinned bindings overlaid with per-call context.
   * Already shallow-copied and immutable — do not mutate.
   */
  data: Readonly<Bindings>;
  level: LogType;
  message?: string;
  namespace: string;
  /** Exact moment of the log call — shared across all transports for the same entry. */
  timestamp: Date;
};

/* ─── Transport ─── */

/**
 * A transport receives a log entry and is responsible for its own delivery and formatting.
 * If a transport throws, the logger catches it, reports it via a dev-only warning, and continues
 * dispatching the entry to remaining transports — a single misbehaving transport can never crash
 * the caller of `log.info()`/etc. or block its siblings.
 */
export type Transport = (entry: LogEntry) => void;

/** Transform or filter entries before dispatch. Return `null` to drop an entry. */
export type LogMiddleware = (entry: LogEntry) => LogEntry | null;

/* ─── Transport option types ─── */

export type RemoteLogData = {
  data?: Readonly<Bindings>;
  env: 'development' | 'production';
  level: LogType;
  message?: string;
  namespace?: string;
  timestamp: string;
};

export type RemoteTransportOptions = {
  /** Override the detected runtime environment. Default: auto-detected. */
  env?: 'development' | 'production';
  /** Remote delivery handler. */
  handler: (type: LogType, data: RemoteLogData) => void | Promise<unknown>;
  /** Minimum level to forward. Default: 'debug'. */
  level?: LogLevel;
  /** Observe synchronous throws and asynchronous rejections from `handler`. */
  onError?: (error: unknown, data: RemoteLogData) => void;
};

export type JsonTransportOptions = {
  /**
   * Custom output field names. Useful for adapting to aggregator conventions
   * (Datadog, ELK, Loki, etc.).
   *
   * @example
   * jsonTransport({ fields: { level: 'severity', time: '@timestamp', msg: 'message' } })
   */
  fields?: {
    level?: string;
    msg?: string;
    ns?: string;
    time?: string;
  };
  /** Minimum level to output. Default: 'debug'. */
  level?: LogLevel;
  /** Custom output function. Default: process.stdout.write. */
  output?: (line: string) => void;
  /**
   * Replace circular references with `'[Circular]'` instead of throwing a TypeError.
   * Useful in environments where log payloads may contain complex object graphs.
   * Default: false.
   */
  safe?: boolean;
};

/** Handle returned by `batchTransport()`. */
export type BatchHandle = {
  [Symbol.asyncDispose]: () => Promise<void>;
  dispose: () => Promise<void>;
  readonly disposed: boolean;
  flush: () => Promise<void>;
  transport: Transport;
};

export type BatchTransportOptions = {
  /** Flush interval in milliseconds. Default: 5000. */
  interval?: number;
  /** Minimum level to buffer. Default: 'debug'. */
  level?: LogLevel;
  /** Hard limit on buffered entries. Oldest entries are dropped first. Default: unbounded. */
  maxBuffer?: number;
  /** Flush once this many entries are buffered. Default: 50. */
  maxSize?: number;
  /** Deliver one accepted batch. Batches are delivered serially. */
  onFlush: (entries: LogEntry[]) => void | Promise<void>;
  /** Observe delivery failures. Manual failures reject `flush()`; automatic failures reject `dispose()`. */
  onFlushError?: (entries: LogEntry[], error: unknown) => void;
};

export type SampleTransportOptions = {
  /** Minimum level to sample. Default: 'debug'. */
  level?: LogLevel;
  /** Finite fraction of entries to forward, from 0 to 1. */
  rate: number;
  transport: Transport;
};

export type RedactTransportOptions = {
  /** Exact field names to replace at any depth. */
  keys: readonly string[];
  /** Maximum nested object depth to inspect. Deeper subtrees are replaced entirely. Default: 20. */
  maxDepth?: number;
  /** Replacement used for matching fields and depth-limited subtrees. Default: '[REDACTED]'. */
  replacement?: string;
  transport: Transport;
};

/* ─── Logger options ─── */

export type RuneOptions = {
  /** Initial pinned bindings for this logger instance. `Error` values are auto-serialized, same as per-call context. */
  bindings?: Bindings;
  /** Minimum log level for this logger instance. Default: 'debug'. */
  logLevel?: LogLevel;
  /** Middleware applied once, in order, before dispatch to every transport. */
  middleware?: LogMiddleware[];
  /**
   * Namespace for this logger. When passed to `child()`, it is automatically
   * dot-joined to the parent namespace (e.g. parent `'api'` + child `'auth'` → `'api.auth'`).
   */
  namespace?: string;
  /**
   * Transport pipeline. Each transport receives every entry that passes the level threshold.
   * Default: [consoleTransport()].
   */
  transports?: Transport[];
};

/* ─── Log method ─── */

/**
 * Signature shared by all five log-level methods.
 *
 * Message-first calls are preferred for ordinary application logging. Context-first and error-first
 * calls support structured events, adapters, and error forwarding without synthetic messages.
 * `Error` values in context are serialized shallowly to `{ message, name, stack }`.
 *
 * @example
 * log.info('request started', { requestId: 'abc' })
 * log.debug(event, `bus:${event.type}`)
 * log.error(new Error('timeout'), { requestId: 'abc' }, 'request failed')
 */
export type LogMethod = {
  (message: string, context?: Bindings): void;
  (error: Error, message?: string): void;
  (error: Error, context: Bindings, message?: string): void;
  (context: Bindings, message?: string): void;
};

/* ─── Logger interface ─── */

export type Logger = {
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose]: () => void;
  /** Snapshot of currently pinned bindings. */
  readonly bindings: Readonly<Bindings>;
  /** Create a child logger with config overrides. Inherits all config and bindings by default. */
  child: (overrides?: RuneOptions) => Logger;
  debug: LogMethod;
  /** `AbortSignal` aborted when `dispose()` is called. Use to tie external lifetimes to this logger. */
  readonly disposalSignal: AbortSignal;
  /**
   * Marks the logger as disposed — all subsequent log calls become no-ops.
   * Aborts `disposalSignal`. Idempotent — safe to call multiple times.
   */
  dispose: () => void;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  /** Returns true if entries at this level will pass the configured threshold. */
  enabled: (type: LogLevel) => boolean;
  error: LogMethod;
  fatal: LogMethod;
  /**
   * Wrap a callback in a console group, closing it even on throw/reject.
   * Pass a `level` to gate the group header on the configured log threshold
   * (e.g. `level: 'debug'` suppresses the group when `logLevel` is above `'debug'`).
   * Default: always renders (unless `logLevel` is `'off'`).
   */
  group: <T>(label: string, fn: () => T, level?: LogType) => T;
  /**
   * Same as `group`, using `console.groupCollapsed`.
   * Pass a `level` to gate the group on the configured log threshold.
   */
  groupCollapsed: <T>(label: string, fn: () => T, level?: LogType) => T;
  info: LogMethod;
  /** Active log level for this logger instance. */
  readonly logLevel: LogLevel;
  /** Middleware pipeline snapshot. */
  readonly middleware: readonly LogMiddleware[];
  /** Namespace string for this logger instance. */
  readonly namespace: string;
  /**
   * Measure execution time of `fn` and emit a structured log entry.
   * The entry message is `label`; `data` contains `{ duration_ms }` (rounded to 2 dp).
   * When `fn` throws or rejects, `data` also includes `{ err }` with the serialized error.
   * @param label - Human-readable description of the operation.
   * @param fn - Synchronous or async function to time.
   * @param level - Log level for the timing entry. Default: `'debug'`.
   */
  time: <T>(label: string, fn: () => T, level?: LogType) => T;
  /** Transport pipeline for this logger instance. */
  readonly transports: readonly Transport[];
  /** Return a new logger with one additional middleware function. */
  use: (middleware: LogMiddleware) => Logger;
  warn: LogMethod;
  /**
   * Derive a child logger with additional pinned bindings.
   * The returned logger is fully independent — disposing it does not affect the parent,
   * and disposing the parent does not affect child loggers.
   */
  withBindings: (bindings: Bindings) => Logger;
};

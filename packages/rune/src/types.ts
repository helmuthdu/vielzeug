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

/** Returns true if `level` passes the `threshold`. Returns false when `level` is 'off'. Exported for transport/middleware authors. */
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
 * If a transport throws, the logger catches it, reports it via a dev-only warning (wrapped in
 * `RuneTransportError`), and continues dispatching the entry to remaining transports — a single
 * misbehaving transport can never crash the caller of `log.info()`/etc. or block its siblings.
 */
export type Transport = (entry: LogEntry) => void;

/**
 * Middleware function that transforms or filters log entries before dispatch. Return null to drop the entry.
 * If middleware throws, the logger catches it, reports it via a dev-only warning, and drops the entry
 * (no transports run for it) rather than crashing the caller.
 */
export type LogMiddleware = (entry: LogEntry) => LogEntry | null;

/* ─── Transport option types ─── */

export type RemoteLogData = {
  data?: Bindings;
  env: 'development' | 'production';
  level: LogType;
  message?: string;
  namespace?: string;
  timestamp: string;
};

export type RemoteTransportOptions = {
  /** Override the detected runtime environment. Default: auto-detected. */
  env?: 'development' | 'production';
  /** Remote delivery handler — receives the log type and structured payload. */
  handler: (type: LogType, data: RemoteLogData) => void;
  /** Minimum level to forward. Default: 'debug'. */
  level?: LogLevel;
  /**
   * Called when the handler throws or rejects.
   * The async error path is separate from any synchronous errors in the emit call stack.
   * Default: a dev-only `console.warn` (gated by `__RUNE_PROD__`). In production builds,
   * unhandled remote transport errors are silently swallowed — pass an explicit `onError`
   * if you need delivery-failure observability in production.
   */
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

/** Handle returned by `batchTransport()`. Pass `handle.transport` to `createLogger({ transports })`. */
export type BatchHandle = {
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose]: () => void;
  /** Stop the interval timer and flush remaining entries. Call on shutdown. Idempotent. */
  dispose: () => void;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  /** Immediately flush buffered entries to the downstream handler without stopping the timer. */
  flush: () => void;
  /** The transport function to pass to `createLogger({ transports: [handle.transport] })`. */
  transport: Transport;
};

export type BatchTransportOptions = {
  /** Flush interval in milliseconds. Default: 5000. */
  interval?: number;
  /** Minimum level to buffer. Default: 'debug'. */
  level?: LogLevel;
  /**
   * Hard limit on the in-memory buffer size. When the buffer exceeds this value,
   * the oldest entries are dropped to prevent unbounded memory growth.
   * Unlike `maxSize`, this does NOT trigger a flush — it silently drops.
   * Default: unbounded.
   */
  maxBuffer?: number;
  /** Maximum buffer size before an early flush. Default: 50. */
  maxSize?: number;
  /**
   * Callback to receive flushed batches. May return a Promise — async rejections
   * are forwarded to `onFlushError` in addition to synchronous throws.
   */
  onFlush: (entries: LogEntry[]) => void | Promise<void>;
  /**
   * Called when onFlush throws synchronously or rejects asynchronously.
   * Allows retry/dead-letter logic. Default: silent.
   */
  onFlushError?: (entries: LogEntry[], error: unknown) => void;
};

export type PipeOptions = {
  /**
   * Called when one of the piped transports throws.
   * Receives the thrown error and the log entry that triggered it.
   * Default: silent (errors are swallowed to protect remaining transports).
   */
  onError?: (error: unknown, entry: LogEntry) => void;
};

export type SampleTransportOptions = {
  /** Minimum level to sample. Default: 'debug'. */
  level?: LogLevel;
  /** Fraction of entries to forward (0–1). */
  rate: number;
  /** Downstream transport to receive sampled entries. */
  transport: Transport;
};

export type RedactTransportOptions = {
  /**
   * Field names to replace at any depth in `data`.
   * Matched by exact field name — dot-path notation (e.g. `'user.password'`) is NOT supported.
   * A key like `'password'` will redact every field named `'password'` at any nesting level.
   */
  keys: string[];
  /**
   * Maximum object nesting depth to traverse during redaction.
   * Objects deeper than this limit are returned as-is (not redacted).
   * A dev-only warning is emitted when the cap is hit.
   * Default: 20.
   * @security In production builds, the depth warning is suppressed — deeply-nested sensitive
   * fields beyond `maxDepth` will pass through unredacted without any indication. Ensure that
   * sensitive payloads are not nested beyond this limit, or lower `maxDepth` as needed.
   */
  maxDepth?: number;
  /** Replacement value for redacted fields. Default: '[REDACTED]'. */
  replacement?: string;
  /** Downstream transport to receive the redacted entry. */
  transport: Transport;
};

/* ─── Logger options ─── */

export type RuneOptions = {
  /** Initial pinned bindings for this logger instance. `Error` values are auto-serialized, same as per-call context. */
  bindings?: Bindings;
  /** Minimum log level for this logger instance. Default: 'debug'. */
  logLevel?: LogLevel;
  /** Middleware pipeline applied to every entry before dispatch to transports. */
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
 * - `log.info('message')` — string-only, most common.
 * - `log.info({ ...fields }, 'message')` — structured context + optional message.
 *   `Error` values in `fields` are automatically serialized to `{ message, name, stack }`.
 *   Serialization is shallow only — an `Error` nested inside a nested object is left as-is.
 * - `log.error(err, { ...fields }, 'message')` — Error first, then optional context + message.
 *   Shorthand for the pattern where an Error is the primary subject of the log call.
 *   The context object may be omitted entirely: `log.error(err, 'message')`.
 *
 * @example
 * log.error({ err: new Error('timeout'), requestId }, 'request failed')
 * log.error(new Error('timeout'), { requestId }, 'request failed')
 */
export type LogMethod = {
  (message: string): void;
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
   * Aborts `disposalSignal`. Does NOT auto-discover or dispose batch transports;
   * hold a direct reference to `batchTransport` and call its `dispose()` on shutdown.
   * Idempotent — safe to call multiple times.
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
  /** Middleware pipeline applied before dispatch. */
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
  /**
   * Add a middleware function to the pipeline. Returns a **new** logger — the original is unchanged.
   * Discarding the return value is a common mistake: always assign the result.
   * @example
   * const log = baseLog.use(tracingMiddleware); // ✓ keep the result
   */
  use: (middleware: LogMiddleware) => Logger;
  warn: LogMethod;
  /**
   * Derive a child logger with additional pinned bindings.
   * The returned logger is fully independent — disposing it does not affect the parent,
   * and disposing the parent does not affect child loggers.
   */
  withBindings: (bindings: Bindings) => Logger;
};

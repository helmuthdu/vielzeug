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

/* ─── Bindings & errors ─── */

export type Bindings = Record<string, unknown>;

/* ─── Log entry ─── */

/**
 * The structured record produced by every log call and dispatched to all transports.
 * Transports receive this value and are responsible for their own formatting/delivery.
 */
export type LogEntry = {
  /** Pinned bindings from withBindings() — already shallow-copied. */
  bindings: Readonly<Bindings>;
  /** Per-call context passed as the first argument. */
  context?: Bindings;
  level: LogType;
  message?: string;
  namespace: string;
  /** Exact moment of the log call — shared across all transports for the same entry. */
  timestamp: Date;
};

/* ─── Transport ─── */

/** A transport receives a log entry and is responsible for its own delivery and formatting. */
export type Transport = (entry: LogEntry) => void;

/** Middleware function that transforms or filters log entries before dispatch. Return null to drop the entry. */
export type LogMiddleware = (entry: LogEntry) => LogEntry | null;

/* ─── Console theme ─── */

/**
 * Per-level style definition for the console transport.
 * All fields are optional when providing a level override — unspecified fields fall back to the default theme.
 */
export type ConsoleThemeEntry = {
  /** Badge text / glyph to display (e.g. '🅸', '→', 'INFO'). */
  badge: string;
  /** Background color (CSS hex). Used as badge background in browser; as badge text tint in Node ANSI. */
  bg: string;
  /** Border color for the badge (browser only). */
  border: string;
  /** Foreground / text color inside the badge (browser only). */
  color: string;
};

/**
 * Partial theme overrides merged on top of the default theme.
 * Each level entry is also partial — only specify the fields you want to change.
 *
 * @example
 * consoleTransport({ theme: { error: { badge: '✖' } } }) // only changes the badge glyph
 */
export type ConsoleTheme = Partial<Record<LogType | 'group' | 'ns', Partial<ConsoleThemeEntry>>>;

/**
 * Fully-resolved console theme where every level and every field is populated.
 * Returned by `resolveTheme()`. Useful for building custom transports on top of the default theme.
 */
export type ResolvedTheme = Record<LogType | 'group' | 'ns', ConsoleThemeEntry>;

/* ─── Transport option types ─── */

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
   * Custom object inspector function. When provided, context/bindings objects are
   * passed through this function before being written to the console.
   * Typical use: pass `require('util').inspect` or `(v) => util.inspect(v, { colors: true, depth: 4 })`
   * in Node.js environments for richer object formatting.
   */
  inspectFn?: (value: unknown) => string;
  /** Minimum level to output. Default: 'debug'. */
  level?: LogLevel;
  /** Partial theme overrides merged on top of the default theme. */
  theme?: ConsoleTheme;
  /** Whether to include timestamp in console output. Default: true. */
  timestamp?: boolean;
};

export type RemoteLogData = {
  context?: Bindings;
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
   * Defaults to console.warn. The async error path is separate from the synchronous
   * onTransportError on the logger, because async delivery failures happen outside
   * the emit call stack.
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

export type BatchTransport = Transport & {
  /** Stop the interval timer and flush remaining entries. Call on shutdown. */
  dispose: () => void;
  /** Immediately flush buffered entries to the downstream handler without stopping the timer. */
  flush: () => void;
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
   * Field names to replace at any depth in bindings and context.
   * Matched by exact field name — dot-path notation (e.g. `'user.password'`) is NOT supported.
   * A key like `'password'` will redact every field named `'password'` at any nesting level.
   */
  keys: string[];
  /** Replacement value for redacted fields. Default: '[REDACTED]'. */
  replacement?: string;
  /** Downstream transport to receive the redacted entry. */
  transport: Transport;
};

/* ─── Logger config ─── */

export type RuneOptions = {
  /** Initial pinned bindings for this logger instance. */
  bindings?: Bindings;
  /** Minimum log level for this logger instance. Default: 'debug'. */
  logLevel?: LogLevel;
  /** Middleware pipeline applied to every entry before dispatch to transports. */
  middleware?: LogMiddleware[];
  /**
   * Namespace for this logger. When passed to `child()`, it is automatically
   * dot-joined to the parent namespace (e.g. parent `'api'` + child `'auth'` → `'api.auth'`).
   * Prefix with `/` to set an absolute namespace that replaces the parent
   * (e.g. `'/root'` → `'root'`, ignoring the parent namespace).
   */
  namespace?: string;
  /**
   * Override the timestamp source. Accepts any zero-arg function returning a Date.
   * Use a fixed date in tests for deterministic timestamps without mocking Date.
   * Default: () => new Date()
   */
  now?: () => Date;
  /**
   * Called when a transport throws. Defaults to console.warn.
   * Receives the thrown error, the entry that caused it, and the transport index.
   */
  onTransportError?: (error: unknown, entry: LogEntry, transportIndex: number) => void;
  /**
   * Fraction of entries to sample before they reach transports (0–1).
   * Applied after middleware, before transport dispatch.
   * More efficient than sampleTransport — skips the entire transport pipeline for dropped entries.
   * Default: 1 (no sampling).
   */
  sample?: number;
  /**
   * Console theme overrides. Applies to both consoleTransport (for log entries) and
   * group()/groupCollapsed() (for group labels). Inherited by child loggers.
   * Default: DEFAULT_THEME.
   */
  theme?: ConsoleTheme;
  /**
   * Transport pipeline. Each transport receives every entry that passes the level threshold.
   * Default: [consoleTransport()].
   */
  transports?: Transport[];
};

export type RuneConfig = {
  logLevel: LogLevel;
  middleware: LogMiddleware[];
  namespace: string;
  now: () => Date;
  onTransportError: (error: unknown, entry: LogEntry, transportIndex: number) => void;
  sample: number;
  theme: ConsoleTheme | undefined;
  transports: Transport[];
};

/* ─── TimeOptions ─── */

/**
 * Options for the `time()` method. Can be passed as a plain `LogType` string
 * (e.g. `'info'`) or as an object to allow future extension.
 */
export type TimeOptions = {
  /** Log level for the timing entry. Default: `'debug'`. */
  level?: LogType;
};

/* ─── Log method ─── */

/**
 * Overloaded signature shared by all five log-level methods.
 * No-arg calls are intentionally excluded — every call must produce output.
 */
export type LogMethod = {
  (message: string): void;
  (context: Bindings, message?: string): void;
  (error: Error, context: Bindings, message?: string): void;
  (error: Error, message?: string): void;
};

/* ─── Logger interface ─── */

export type Logger = {
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose]: () => void;
  /** Snapshot of currently pinned bindings. */
  readonly bindings: Readonly<Bindings>;
  /** Create a child logger with config overrides. Inherits all config and bindings by default. */
  child: (overrides?: RuneOptions) => Logger;
  /** Snapshot of current resolved configuration. */
  readonly config: Readonly<RuneConfig>;
  debug: LogMethod;
  /** `AbortSignal` aborted when `dispose()` is called. Use to tie external lifetimes to this logger. */
  readonly disposalSignal: AbortSignal;
  /**
   * Dispose all `BatchTransport` instances in the transport array (calls their `.dispose()`).
   * Call on app shutdown to flush pending entries and stop interval timers.
   * Safe to call on loggers without batch transports — it is a no-op in that case.
   * **Note:** only top-level transports are inspected. A `batchTransport` wrapped inside
   * `pipe(...)` will not be discovered; hold a reference to the batch and dispose it manually.
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
  /**
   * Restore the log level to the value set at construction time, undoing any `setLevel()` calls.
   */
  resetLevel: () => void;
  /**
   * Mutate the log level threshold in-place. Affects this logger instance immediately.
   * Useful for toggling debug mode at runtime without recreating logger instances.
   * Note: children created via `child()` after this call inherit the new level;
   * children created before retain their own independent snapshot.
   */
  setLevel: (level: LogLevel) => void;
  /**
   * Measure execution time of `fn` and emit a structured log entry.
   * The entry message is `label`; context contains `{ duration_ms }` (rounded to 2 dp).
   * When `fn` throws or rejects, the entry also includes `{ err }` with the serialized error.
   * @param label - Human-readable description of the operation.
   * @param fn - Synchronous or async function to time.
   * @param opts - Log level for the timing entry. Default: `'debug'`.
   *   Accepts a `LogType` string or a `TimeOptions` object `{ level?: LogType }`.
   */
  time: <T>(label: string, fn: () => T, opts?: LogType | TimeOptions) => T;
  /**
   * Add a middleware function to the pipeline. Returns a **new** logger — the original is unchanged.
   * Discarding the return value is a common mistake: always assign the result.
   * @example
   * const log = baseLog.use(tracingMiddleware); // ✓ keep the result
   */
  use: (middleware: LogMiddleware) => Logger;
  warn: LogMethod;
  /** Derive a child logger with additional pinned bindings. */
  withBindings: (bindings: Bindings) => Logger;
};

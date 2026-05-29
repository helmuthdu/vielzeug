/* ─── Log levels ─── */

export type LogType = 'debug' | 'error' | 'fatal' | 'info' | 'warn';
export type LogLevel = LogType | 'off';

/* ─── Styling ─── */

export type Variant = 'icon' | 'symbol' | 'text';

/* ─── Bindings & errors ─── */

export type Bindings = Record<string, unknown>;

export type SerializedError = {
  message: string;
  name: string;
  stack?: string;
};

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

/* ─── Transport option types ─── */

export type ConsoleTransportOptions = {
  /** Minimum level to output. Default: 'debug'. */
  level?: LogLevel;
  /** Whether to include timestamp in console output. Default: true. */
  timestamp?: boolean;
  /** Badge rendering style. Default: 'symbol'. */
  variant?: Variant;
};

export type RemoteLogData = {
  context?: Bindings;
  env: 'development' | 'production';
  level: LogType;
  message?: string;
  namespace?: string;
  timestamp: string;
};

export type RemoteHandler = (type: LogType, data: RemoteLogData) => void;

export type RemoteTransportOptions = {
  /** Override the detected runtime environment. Default: auto-detected. */
  env?: 'development' | 'production';
  /** Minimum level to forward. Default: 'debug'. */
  level?: LogLevel;
};

export type JsonTransportOptions = {
  /** Minimum level to output. Default: 'debug'. */
  level?: LogLevel;
  /** Custom output function. Default: process.stdout.write. */
  output?: (line: string) => void;
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
  /** Maximum buffer size before an early flush. Default: 50. */
  maxSize?: number;
  /** Callback to receive flushed batches. */
  onFlush: (entries: LogEntry[]) => void;
};

export type SampleTransportOptions = {
  /** Fraction of entries to forward (0–1). */
  rate: number;
  /** Downstream transport to receive sampled entries. */
  transport: Transport;
};

export type RedactTransportOptions = {
  /** Field names to replace at any depth in bindings and context. */
  keys: string[];
  /** Replacement value for redacted fields. Default: '[REDACTED]'. */
  replacement?: string;
  /** Downstream transport to receive the redacted entry. */
  transport: Transport;
};

/* ─── Logger config ─── */

export type RuneOptions = {
  /** Override the detected runtime environment (used by remoteTransport). Default: auto-detected. */
  env?: 'development' | 'production';
  /** Minimum log level for this logger instance. Default: 'debug'. */
  logLevel?: LogLevel;
  /** Dot-separated namespace prefix, e.g. 'app.api'. */
  namespace?: string;
  /**
   * Transport pipeline. Each transport receives every entry that passes the level threshold.
   * Default: [consoleTransport()].
   */
  transports?: Transport[];
};

export type RuneConfig = {
  env: 'development' | 'production';
  logLevel: LogLevel;
  namespace: string;
  transports: Transport[];
};

/* ─── Log method ─── */

/**
 * Overloaded signature shared by all five log-level methods.
 * No-arg calls are intentionally excluded — every call must produce output.
 */
export type LogMethod = {
  (message: string): void;
  (context: Bindings, message?: string): void;
  (error: Error, message?: string): void;
};

/* ─── Logger interface ─── */

export type Logger = {
  /** Snapshot of currently pinned bindings. */
  readonly bindings: Readonly<Bindings>;
  /** Create a child logger with config overrides. Inherits transports by default. */
  child: (overrides?: RuneOptions) => Logger;
  /** Snapshot of current resolved configuration. */
  readonly config: Readonly<RuneConfig>;
  debug: LogMethod;
  /** Returns true if entries at this level will pass the configured threshold. */
  enabled: (type: LogLevel) => boolean;
  error: LogMethod;
  fatal: LogMethod;
  /** Wrap a callback in a console group, closing it even on throw/reject. */
  group: <T>(label: string, fn: () => T) => T;
  /** Wrap a callback in a collapsed console group, closing it even on throw/reject. */
  groupCollapsed: <T>(label: string, fn: () => T) => T;
  info: LogMethod;
  /** Derive a child logger with an extended dot-separated namespace. */
  scope: (name: string) => Logger;
  /** Measure execution time and emit a structured debug entry with duration_ms. */
  time: <T>(label: string, fn: () => T) => T;
  warn: LogMethod;
  /** Derive a child logger with additional pinned bindings. */
  withBindings: (bindings: Bindings) => Logger;
};

/* ─── Lazy binding marker ─── */

export const LAZY = Symbol.for('rune.lazy');

export type LazyBinding = { readonly fn: () => unknown; readonly [LAZY]: true };

export function isLazyBinding(value: unknown): value is LazyBinding {
  return typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[LAZY] === true;
}

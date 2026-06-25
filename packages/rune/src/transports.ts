import type {
  BatchHandle,
  BatchTransportOptions,
  Bindings,
  JsonTransportOptions,
  LogEntry,
  PipeOptions,
  RedactTransportOptions,
  RemoteLogData,
  RemoteTransportOptions,
  SampleTransportOptions,
  Transport,
} from './types';

import { warn } from './_warn';
import { isLevelEnabled } from './types';

export type { RemoteLogData };

/* ─── Environment detection ─── */

function detectEnv(): 'development' | 'production' {
  if (typeof window === 'undefined') {
    return (globalThis as Record<string, unknown> & { process?: { env?: { NODE_ENV?: string } } }).process?.env
      ?.NODE_ENV === 'production'
      ? 'production'
      : 'development';
  }

  return (import.meta as ImportMeta & { env?: { PROD?: boolean } }).env?.PROD ? 'production' : 'development';
}

/* ─── remoteTransport ─── */

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
  const onError = options.onError ?? ((err: unknown) => warn(`remote transport error: ${String(err)}`));

  return (entry: LogEntry): void => {
    if (!isLevelEnabled(level, entry.level)) return;

    const hasData = Object.keys(entry.data).length > 0;
    const payload: RemoteLogData = {
      data: hasData ? entry.data : undefined,
      env,
      level: entry.level,
      message: entry.message,
      namespace: entry.namespace || undefined,
      timestamp: entry.timestamp.toISOString(),
    };

    Promise.resolve()
      .then(() => handler(entry.level, payload))
      .catch((err: unknown) => onError(err, payload));
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

    const record: Record<string, unknown> = {
      ...entry.data,
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
 * Returns a `BatchHandle` with `.transport`, `.flush()`, and `.dispose()` methods:
 * - `.transport` — pass to `createLogger({ transports: [handle.transport] })`
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
 * createLogger({ transports: [batch.transport] });
 * batch.dispose(); // call on app shutdown
 */
export function batchTransport(options: BatchTransportOptions): BatchHandle {
  const level = options.level ?? 'debug';
  const maxSize = options.maxSize ?? 50;
  const maxBuffer = options.maxBuffer;
  const interval = options.interval ?? 5000;

  let buffer: LogEntry[] = [];
  let timer: ReturnType<typeof setInterval> | undefined;
  let batchDisposed = false;

  function flush(): void {
    if (buffer.length === 0) return;

    const entries = buffer;

    buffer = [];

    Promise.resolve()
      .then(() => options.onFlush(entries))
      .catch((err: unknown) => options.onFlushError?.(entries, err));
  }

  const transportFn: Transport = (entry: LogEntry): void => {
    if (batchDisposed) return;

    if (!isLevelEnabled(level, entry.level)) return;

    if (!timer) timer = setInterval(flush, interval);

    buffer.push(entry);

    if (maxBuffer !== undefined && buffer.length > maxBuffer) {
      buffer = buffer.slice(buffer.length - maxBuffer);
    }

    if (buffer.length >= maxSize) flush();
  };

  const handle: BatchHandle = {
    dispose(): void {
      if (batchDisposed) return;

      batchDisposed = true;

      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }

      flush();
    },
    get disposed(): boolean {
      return batchDisposed;
    },
    flush,
    [Symbol.dispose](): void {
      handle.dispose();
    },
    transport: transportFn,
  };

  return handle;
}

/* ─── sampleTransport ─── */

/**
 * Probabilistically forwards entries to a downstream transport.
 * Useful for reducing volume of high-frequency debug logs in production.
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
 * Strips sensitive fields from `data` before forwarding to a downstream transport.
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
  const { keys, maxDepth = 20, replacement = '[REDACTED]', transport } = options;

  for (const key of keys) {
    if (key.includes('.')) {
      warn(
        `redactTransport: key "${key}" contains a dot. Dot-path notation is not supported — use the plain field name (e.g. 'password') to redact at any depth.`,
      );
    }
  }

  const keySet = new Set(keys);

  function redactValue(v: unknown, depth = 0): unknown {
    if (depth > maxDepth) {
      warn(
        `redactTransport: object nesting depth exceeded ${maxDepth} — redaction truncated at this level. Sensitive fields below depth ${maxDepth} may not be redacted.`,
      );

      return v;
    }

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
    transport({ ...entry, data: redactObject(entry.data as Bindings) });
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

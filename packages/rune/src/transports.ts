import { warn } from './_dev';
import { isUnsafeObjectKey } from './_prototype';
import { RuneConfigError } from './errors';
import type {
  BatchHandle,
  BatchTransportOptions,
  Bindings,
  JsonTransportOptions,
  LogEntry,
  RedactTransportOptions,
  RemoteLogData,
  RemoteTransportOptions,
  SampleTransportOptions,
  Transport,
} from './types';
import { isLevelEnabled } from './types';

/* ─── remoteTransport ─── */

function detectEnv(): 'development' | 'production' {
  if (typeof window !== 'undefined') return 'development';

  return (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV === 'production'
    ? 'production'
    : 'development';
}

/** Forward entries asynchronously to a remote delivery handler. */
export function remoteTransport(options: RemoteTransportOptions): Transport {
  const { handler } = options;
  const level = options.level ?? 'debug';
  const env = options.env ?? detectEnv();
  const onError = options.onError ?? ((error: unknown) => warn(`remote transport error: ${String(error)}`));

  return (entry): void => {
    if (!isLevelEnabled(level, entry.level)) return;

    const payload: RemoteLogData = {
      data: Object.keys(entry.data).length > 0 ? entry.data : undefined,
      env,
      level: entry.level,
      message: entry.message,
      namespace: entry.namespace || undefined,
      timestamp: entry.timestamp.toISOString(),
    };

    Promise.resolve()
      .then(() => handler(entry.level, payload))
      .catch((error: unknown) => {
        try {
          onError(error, payload);
        } catch (observerError) {
          warn(`remote transport error observer threw: ${String(observerError)}`);
        }
      });
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
      ).process?.stdout?.write(`${line}\n`);
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

function assertFiniteNumber(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new RuneConfigError(`${name} must be a finite number`);
}

function assertNonNegativeInteger(value: number, name: string): void {
  assertFiniteNumber(value, name);
  if (!Number.isInteger(value) || value < 0) throw new RuneConfigError(`${name} must be a non-negative integer`);
}

function assertPositiveInteger(value: number, name: string): void {
  assertFiniteNumber(value, name);
  if (!Number.isInteger(value) || value <= 0) throw new RuneConfigError(`${name} must be a positive integer`);
}

/* ─── batchTransport ─── */

/** Buffer entries and deliver accepted batches serially. */
export function batchTransport(options: BatchTransportOptions): BatchHandle {
  const level = options.level ?? 'debug';
  const maxSize = options.maxSize ?? 50;
  const maxBuffer = options.maxBuffer;
  const interval = options.interval ?? 5000;

  assertFiniteNumber(interval, 'batchTransport interval');
  if (interval <= 0) throw new RuneConfigError('batchTransport interval must be greater than zero');
  assertPositiveInteger(maxSize, 'batchTransport maxSize');
  if (maxBuffer !== undefined) assertNonNegativeInteger(maxBuffer, 'batchTransport maxBuffer');

  let buffer: LogEntry[] = [];
  let timer: ReturnType<typeof setInterval> | undefined;
  let automaticFailure: { error: unknown } | undefined;
  let disposed = false;
  let deliveryTail: Promise<void> = Promise.resolve();
  let disposePromise: Promise<void> | undefined;

  const deliver = async (entries: LogEntry[]): Promise<void> => {
    try {
      await options.onFlush(entries);
    } catch (error) {
      try {
        options.onFlushError?.(entries, error);
      } catch (observerError) {
        warn(`batch transport error observer threw: ${String(observerError)}`);
      }
      throw error;
    }
  };

  const enqueue = (entries: LogEntry[]): Promise<void> => {
    const delivery = deliveryTail.then(() => deliver(entries));
    deliveryTail = delivery.catch(() => undefined);
    return delivery;
  };

  const flush = (): Promise<void> => {
    if (buffer.length === 0) return deliveryTail;

    const entries = buffer;
    buffer = [];
    return enqueue(entries);
  };

  const flushAutomatically = (): void => {
    void flush().catch((error: unknown) => {
      automaticFailure ??= { error };
    });
  };

  const transport: Transport = (entry): void => {
    if (disposed || !isLevelEnabled(level, entry.level)) return;

    if (!timer) timer = setInterval(flushAutomatically, interval);
    buffer.push(entry);

    if (maxBuffer !== undefined && buffer.length > maxBuffer) buffer = buffer.slice(buffer.length - maxBuffer);
    if (buffer.length >= maxSize) flushAutomatically();
  };

  const handle: BatchHandle = {
    dispose(): Promise<void> {
      if (disposePromise) return disposePromise;

      disposed = true;
      if (timer) clearInterval(timer);
      timer = undefined;
      disposePromise = flush().then(() => {
        if (automaticFailure) throw automaticFailure.error;
      });
      return disposePromise;
    },
    get disposed(): boolean {
      return disposed;
    },
    flush,
    [Symbol.asyncDispose](): Promise<void> {
      return handle.dispose();
    },
    transport,
  };

  return handle;
}

/* ─── sampleTransport ─── */

/** Forward a random fraction of entries to a downstream transport. */
export function sampleTransport(options: SampleTransportOptions): Transport {
  const { rate, transport } = options;
  const level = options.level ?? 'debug';

  assertFiniteNumber(rate, 'sampleTransport rate');
  if (rate < 0 || rate > 1) throw new RuneConfigError('sampleTransport rate must be between zero and one');

  return (entry): void => {
    if (isLevelEnabled(level, entry.level) && Math.random() < rate) transport(entry);
  };
}

/* ─── redactTransport ─── */

export function redactTransport(options: RedactTransportOptions): Transport {
  const { keys, maxDepth = 20, replacement = '[REDACTED]', transport } = options;

  assertNonNegativeInteger(maxDepth, 'redactTransport maxDepth');

  for (const key of keys) {
    if (key.includes('.')) {
      warn(`redactTransport: key "${key}" contains a dot; keys match exact field names, not paths`);
    }
  }

  const keySet = new Set(keys);
  let warnedAboutDepth = false;

  const redact = (value: unknown, depth: number): unknown => {
    if (typeof value !== 'object' || value === null) return value;

    if (depth > maxDepth) {
      if (!warnedAboutDepth) {
        warn(`redactTransport: object nesting depth exceeded ${maxDepth}; deeper subtrees were redacted entirely`);
        warnedAboutDepth = true;
      }
      return replacement;
    }

    if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

    const result: Bindings = {};
    for (const [key, item] of Object.entries(value)) {
      if (isUnsafeObjectKey(key)) continue;
      result[key] = keySet.has(key) ? replacement : redact(item, depth + 1);
    }
    return result;
  };

  return (entry) => transport({ ...entry, data: redact(entry.data, 0) as Bindings });
}

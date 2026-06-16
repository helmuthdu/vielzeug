import type { Bindings, LogEntry, Logger, LogLevel, LogMiddleware, LogType, RuneOptions, Transport } from './types';

import { DEFAULT_THEME, consoleTransport, renderGroup } from './console';
import { resolveBindings } from './lazy';
import { isLevelEnabled } from './types';

/* --- Arg parsing (simplified) --- */

function serializeError(err: Error): { message: string; name: string; stack?: string } {
  return { message: err.message, name: err.name, stack: err.stack };
}

function serializeErrors(ctx: Bindings): Bindings {
  const out: Bindings = {};

  for (const [k, v] of Object.entries(ctx)) {
    out[k] = v instanceof Error ? serializeError(v) : v;
  }

  return out;
}

type ParsedArgs = { context: Bindings | undefined; message: string | undefined };

function parseArgs(msgOrCtx: unknown, second: unknown): ParsedArgs {
  if (typeof msgOrCtx === 'string') {
    return { context: undefined, message: msgOrCtx };
  }

  if (typeof msgOrCtx === 'object' && msgOrCtx !== null) {
    return {
      context: msgOrCtx as Bindings,
      message: second !== undefined ? String(second) : undefined,
    };
  }

  return { context: undefined, message: msgOrCtx !== undefined ? String(msgOrCtx) : undefined };
}

/* --- Namespace joining --- */

/**
 * Joins parent and child namespaces with '.' as separator.
 * Examples:
 *   joinNamespace('api', 'auth') → 'api.auth'
 *   joinNamespace('', 'api')     → 'api'
 *   joinNamespace('api', '')     → 'api'
 */
function joinNamespace(parent: string, child: string): string {
  if (!parent) return child;

  if (!child) return parent;

  return `${parent}.${child}`;
}

/* --- createLogger --- */

/**
 * Creates an isolated logger instance.
 *
 * Accepts two call signatures:
 * - `createLogger()` / `createLogger(options)` — configure via `RuneOptions`
 * - `createLogger('namespace', options?)` — namespace shorthand + optional options
 *
 * Each instance has its own immutable config (logLevel, transports, middleware).
 * To change the log level at runtime, create a new logger or child.
 */
export function createLogger(namespace: string, options?: Omit<RuneOptions, 'namespace'>): Logger;
export function createLogger(options?: RuneOptions): Logger;
export function createLogger(initial: RuneOptions | string = {}, extra?: Omit<RuneOptions, 'namespace'>): Logger {
  const initialOpts: RuneOptions = typeof initial === 'string' ? { namespace: initial, ...extra } : initial;

  const logLevel: LogLevel = initialOpts.logLevel ?? 'debug';
  const middleware: LogMiddleware[] = initialOpts.middleware ?? [];
  const namespace: string = initialOpts.namespace ?? '';
  const transports = initialOpts.transports ?? [consoleTransport()];
  const ownBindings: Bindings = { ...(initialOpts.bindings ?? {}) };

  const disposeController = new AbortController();
  let isDisposed = false;

  const passes = (type: LogType): boolean => isLevelEnabled(logLevel, type);

  const dispatch = (entry: LogEntry): void => {
    let current: LogEntry = entry;

    if (middleware.length > 0) {
      let c: LogEntry = entry;

      for (const mw of middleware) {
        const next = mw(c);

        if (next == null) return;

        c = next;
      }

      current = c;
    }

    for (const t of transports) {
      t(current);
    }
  };

  const emit = (type: LogType, msgOrCtx: unknown, second?: unknown): void => {
    if (isDisposed) return;

    if (!passes(type)) return;

    const { context, message } = parseArgs(msgOrCtx, second);
    const resolvedBindings = resolveBindings(ownBindings);

    const data: Bindings = context
      ? { ...resolvedBindings, ...serializeErrors(resolveBindings(context)) }
      : Object.keys(resolvedBindings).length > 0
        ? resolvedBindings
        : {};

    dispatch({
      data,
      level: type,
      message,
      namespace,
      timestamp: new Date(),
    });
  };

  const timeImpl = <T>(label: string, fn: () => T, level: LogType = 'debug'): T => {
    const start = performance.now();

    const done = (thrownErr?: unknown): void => {
      const duration_ms = Math.round((performance.now() - start) * 100) / 100;
      const ctx: Bindings = { duration_ms };

      if (thrownErr !== undefined)
        ctx['err'] = serializeError(thrownErr instanceof Error ? thrownErr : new Error(String(thrownErr)));

      emit(level, ctx, label);
    };

    try {
      const result = fn();

      if (result instanceof Promise) {
        return result.then(
          (v) => {
            done();

            return v;
          },
          (err: unknown) => {
            done(err);

            return Promise.reject(err) as never;
          },
        ) as T;
      }

      done();

      return result;
    } catch (err) {
      done(err);
      throw err;
    }
  };

  const wrapGroup = <T>(collapsed: boolean, label: string, fn: () => T, level?: LogType): T => {
    if (isDisposed || logLevel === 'off') return fn();

    if (level !== undefined && !passes(level)) {
      return fn();
    }

    renderGroup(collapsed, label, namespace, DEFAULT_THEME);

    try {
      const result = fn();

      if (result instanceof Promise) return result.finally(() => console.groupEnd()) as T;

      console.groupEnd();

      return result;
    } catch (err) {
      console.groupEnd();
      throw err;
    }
  };

  const childLogger = (overrides: RuneOptions = {}): Logger =>
    createLogger({
      bindings: { ...ownBindings, ...(overrides.bindings ?? {}) },
      logLevel: overrides.logLevel ?? logLevel,
      middleware: overrides.middleware ?? middleware,
      namespace: overrides.namespace !== undefined ? joinNamespace(namespace, overrides.namespace) : namespace,
      transports: overrides.transports ?? transports,
    });

  const logger: Logger = {
    get bindings(): Readonly<Bindings> {
      return { ...ownBindings };
    },

    child: childLogger,

    debug: (m: unknown, s?: unknown) => emit('debug', m, s),

    get disposalSignal(): AbortSignal {
      return disposeController.signal;
    },

    dispose: (): void => {
      if (isDisposed) return;

      isDisposed = true;
      disposeController.abort();
    },

    get disposed(): boolean {
      return isDisposed;
    },

    enabled: (type: LogLevel): boolean => isLevelEnabled(logLevel, type),

    error: (m: unknown, s?: unknown) => emit('error', m, s),

    fatal: (m: unknown, s?: unknown) => emit('fatal', m, s),

    group: (label, fn, level) => wrapGroup(false, label, fn, level),

    groupCollapsed: (label, fn, level) => wrapGroup(true, label, fn, level),

    info: (m: unknown, s?: unknown) => emit('info', m, s),

    get logLevel(): LogLevel {
      return logLevel;
    },

    get middleware(): readonly LogMiddleware[] {
      return [...middleware];
    },

    get namespace(): string {
      return namespace;
    },

    [Symbol.dispose](): void {
      logger.dispose();
    },

    time: timeImpl,

    get transports(): readonly Transport[] {
      return [...transports];
    },

    use: (mw: LogMiddleware): Logger => childLogger({ middleware: [...middleware, mw] }),

    warn: (m: unknown, s?: unknown) => emit('warn', m, s),

    withBindings: (bindings: Bindings): Logger => childLogger({ bindings }),
  };

  return logger;
}

export const Rune = createLogger();

import type { Bindings, LogEntry, Logger, LogLevel, LogMiddleware, LogType, RuneConfig, RuneOptions } from './types';

import { resolveBindings } from './lazy';
import { DEFAULT_TRANSPORT, renderGroup, resolveTheme } from './transports';
import { isLevelEnabled } from './types';

/* --- Arg parsing --- */

function serializeError(err: Error): { message: string; name: string; stack?: string } {
  return { message: err.message, name: err.name, stack: err.stack };
}

type ParsedArgs = { context: Bindings | undefined; message: string | undefined };

function parseArgs(msgOrCtx: unknown, second: unknown, third: unknown): ParsedArgs {
  if (msgOrCtx instanceof Error) {
    const ctx: Bindings = { err: serializeError(msgOrCtx) };

    // Accept a plain object as an extra context bag alongside the Error.
    // Reject Error as the second arg to prevent double-serialization.
    if (second !== undefined && typeof second === 'object' && second !== null && !(second instanceof Error)) {
      return {
        context: { ...ctx, ...(second as Bindings) },
        message: third !== undefined ? String(third) : msgOrCtx.message,
      };
    }

    return {
      context: ctx,
      message: second !== undefined ? String(second) : msgOrCtx.message,
    };
  }

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

/* --- Config resolution --- */

function defaultOnTransportError(error: unknown, _entry: LogEntry, index: number): void {
  console.warn(`[rune] transport[${index}] error:`, error);
}

function resolveConfig(opts: RuneOptions): RuneConfig {
  return {
    logLevel: opts.logLevel ?? 'debug',
    middleware: opts.middleware ?? [],
    namespace: opts.namespace ?? '',
    now: opts.now ?? (() => new Date()),
    onTransportError: opts.onTransportError ?? defaultOnTransportError,
    sample: opts.sample ?? 1,
    theme: opts.theme,
    transports: opts.transports ?? [DEFAULT_TRANSPORT],
  };
}

/** Converts resolved config back to RuneOptions — single source of truth for child/use/withBindings. */
function cfgToOpts(cfg: RuneConfig, ownBindings: Bindings): RuneOptions {
  return {
    bindings: ownBindings,
    logLevel: cfg.logLevel,
    middleware: cfg.middleware,
    namespace: cfg.namespace,
    now: cfg.now,
    onTransportError: cfg.onTransportError,
    sample: cfg.sample,
    theme: cfg.theme,
    transports: cfg.transports,
  };
}

/* --- Namespace joining --- */

/**
 * Joins a parent namespace with a child namespace using '.' as the separator.
 * If `child` starts with '/' it is treated as an absolute namespace (the leading slash is stripped).
 * Examples:
 *   joinNamespace('api', 'auth')   → 'api.auth'
 *   joinNamespace('', 'api')       → 'api'
 *   joinNamespace('api', '/root')  → 'root'
 */
function joinNamespace(parent: string, child: string): string {
  if (child.startsWith('/')) return child.slice(1);

  if (!parent) return child;

  if (!child) return parent;

  return `${parent}.${child}`;
}

/* --- createLogger --- */

export function createLogger(initial: RuneOptions | string = {}): Logger {
  const initialOpts: RuneOptions = typeof initial === 'string' ? { namespace: initial } : initial;
  const cfg = resolveConfig(initialOpts);
  const initialLogLevel = cfg.logLevel;
  const ownBindings: Bindings = { ...(initialOpts.bindings ?? {}) };

  // R5: Resolve theme once per logger instance — theme is immutable after construction.
  // Re-resolved only in child() when theme changes.
  const resolvedTheme = resolveTheme(cfg.theme);

  const passes = (type: LogType): boolean => isLevelEnabled(cfg.logLevel, type);

  const dispatch = (entry: LogEntry): void => {
    let current: LogEntry = entry;

    if (cfg.middleware.length > 0) {
      let c: LogEntry | null = entry;

      for (const mw of cfg.middleware) {
        c = mw(c);

        if (c === null) return;
      }

      current = c;
    }

    if (cfg.sample < 1 && Math.random() >= cfg.sample) return;

    for (let i = 0; i < cfg.transports.length; i++) {
      try {
        cfg.transports[i](current);
      } catch (err) {
        cfg.onTransportError(err, current, i);
      }
    }
  };

  const emit = (type: LogType, msgOrCtx: unknown, second?: unknown, third?: unknown): void => {
    if (!passes(type)) return;

    const { context, message } = parseArgs(msgOrCtx, second, third);
    const resolvedBindings = resolveBindings(ownBindings);
    const resolvedContext = context ? resolveBindings(context) : undefined;

    dispatch({
      bindings: resolvedBindings,
      context: resolvedContext,
      level: type,
      message,
      namespace: cfg.namespace,
      timestamp: cfg.now(),
    });
  };

  const timeImpl = <T>(label: string, fn: () => T, opts?: LogType | { level?: LogType }): T => {
    const level: LogType = typeof opts === 'string' ? opts : (opts?.level ?? 'debug');
    const start = performance.now();

    // R7: label is the human message; duration_ms goes into context (not the other way around)
    const done = (): void => {
      const duration_ms = Math.round((performance.now() - start) * 100) / 100;

      emit(level, { duration_ms }, label);
    };

    try {
      const result = fn();

      if (result instanceof Promise) {
        return result.finally(done) as T;
      }

      done();

      return result;
    } catch (err) {
      done();
      throw err;
    }
  };

  // R1: theme comes from cfg — no symbol scanning of transports
  // R5: resolvedTheme is pre-computed once per logger instance
  const wrapGroup = <T>(collapsed: boolean, label: string, fn: () => T): T => {
    if (cfg.logLevel === 'off') return fn();

    renderGroup(collapsed, label, cfg.namespace, resolvedTheme);

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

  const logger: Logger = {
    get bindings(): Readonly<Bindings> {
      return { ...ownBindings };
    },

    // R2: child() is the single place where config is forwarded
    child: (overrides: RuneOptions = {}): Logger =>
      createLogger({
        ...cfgToOpts(cfg, ownBindings),
        ...overrides,
        bindings: { ...ownBindings, ...(overrides.bindings ?? {}) },
        // namespace dot-joins parent.child unless child starts with '/' (absolute)
        namespace:
          overrides.namespace !== undefined ? joinNamespace(cfg.namespace, overrides.namespace) : cfg.namespace,
        // theme merges rather than replaces — child can extend parent overrides
        theme: overrides.theme !== undefined ? { ...cfg.theme, ...overrides.theme } : cfg.theme,
      }),

    get config(): Readonly<RuneConfig> {
      return { ...cfg, middleware: [...cfg.middleware], transports: [...cfg.transports] };
    },

    debug: (m: unknown, s?: unknown, t?: unknown) => emit('debug', m, s, t),

    // R6: isLevelEnabled now handles 'off' → false, so no special-case needed
    enabled: (type: LogLevel): boolean => isLevelEnabled(cfg.logLevel, type),

    error: (m: unknown, s?: unknown, t?: unknown) => emit('error', m, s, t),

    fatal: (m: unknown, s?: unknown, t?: unknown) => emit('fatal', m, s, t),

    group: (label, fn) => wrapGroup(false, label, fn),

    groupCollapsed: (label, fn) => wrapGroup(true, label, fn),

    info: (m: unknown, s?: unknown, t?: unknown) => emit('info', m, s, t),

    resetLevel: (): void => {
      cfg.logLevel = initialLogLevel;
    },

    setLevel: (level: LogLevel): void => {
      cfg.logLevel = level;
    },

    time: timeImpl,

    // R2: delegates to child() — no manual config forwarding
    use: (middleware: LogMiddleware): Logger => logger.child({ middleware: [...cfg.middleware, middleware] }),

    warn: (m: unknown, s?: unknown, t?: unknown) => emit('warn', m, s, t),

    // R2: delegates to child() — no manual config forwarding
    withBindings: (bindings: Bindings): Logger => logger.child({ bindings }),
  };

  return logger;
}

export const Rune = createLogger();

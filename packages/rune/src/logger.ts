import type {
  Bindings,
  LogEntry,
  LogLevel,
  LogMiddleware,
  LogType,
  Logger,
  RuneConfig,
  RuneOptions,
  Transport,
} from './types';

import { resolveBindings } from './lazy';
import {
  CONSOLE_THEME_KEY,
  CONSOLE_TRANSPORT_MARKER,
  DEFAULT_THEME,
  PRIORITY,
  consoleTransport,
  renderGroup,
} from './transports';

/* ─── Arg parsing ─── */

function serializeError(err: Error): { message: string; name: string; stack?: string } {
  return { message: err.message, name: err.name, stack: err.stack };
}

type ParsedArgs = { context: Bindings | undefined; message: string | undefined };

function parseArgs(msgOrCtx: unknown, second: unknown, third: unknown): ParsedArgs {
  // Error, context?, message?
  if (msgOrCtx instanceof Error) {
    const ctx: Bindings = { err: serializeError(msgOrCtx) };

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

  // string message only
  if (typeof msgOrCtx === 'string') {
    return { context: undefined, message: msgOrCtx };
  }

  // context object, optional message
  if (typeof msgOrCtx === 'object' && msgOrCtx !== null) {
    return {
      context: msgOrCtx as Bindings,
      message: second !== undefined ? String(second) : undefined,
    };
  }

  // Fallback — coerce to string message
  return { context: undefined, message: msgOrCtx !== undefined ? String(msgOrCtx) : undefined };
}

/* ─── Config resolution ─── */

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
    transports: opts.transports ?? [consoleTransport()],
  };
}

/* ─── Group helpers ─── */

function hasConsoleTransport(transports: Transport[]): boolean {
  return transports.some((t) => (t as unknown as Record<symbol, unknown>)[CONSOLE_TRANSPORT_MARKER] === true);
}

function getConsoleTheme(transports: Transport[]): typeof DEFAULT_THEME {
  for (const t of transports) {
    const theme = (t as unknown as Record<symbol, unknown>)[CONSOLE_THEME_KEY];

    if (theme !== undefined) return theme as typeof DEFAULT_THEME;
  }

  return DEFAULT_THEME;
}

/* ─── createLogger ─── */

export function createLogger(initial: RuneOptions | string = {}): Logger {
  const initialOpts: RuneOptions = typeof initial === 'string' ? { namespace: initial } : initial;
  const cfg = resolveConfig(initialOpts);
  const ownBindings: Bindings = { ...(initialOpts.bindings ?? {}) };

  const passes = (type: LogLevel): boolean => PRIORITY[cfg.logLevel] <= PRIORITY[type];
  const hasConsole = hasConsoleTransport(cfg.transports);

  const dispatch = (entry: LogEntry): void => {
    // Fast path — skip middleware loop when pipeline is empty (the common case)
    let current: LogEntry = entry;

    if (cfg.middleware.length > 0) {
      let c: LogEntry | null = entry;

      for (const mw of cfg.middleware) {
        c = mw(c);

        if (c === null) return;
      }

      current = c;
    }

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
    // F5 — resolve lazy bindings in per-call context too
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

  // ─── time() — measures execution time; emits a structured entry with duration_ms and label in context ───
  const timeImpl = <T>(label: string, fn: () => T, level: LogType = 'debug'): T => {
    const start = performance.now();

    const done = (): void => {
      const duration_ms = Math.round((performance.now() - start) * 100) / 100;

      emit(level, { duration_ms, label }, 'timer');
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

  // ─── group/groupCollapsed — themed console grouping; skipped when no consoleTransport is configured ───
  const wrapGroup = <T>(collapsed: boolean, label: string, fn: () => T): T => {
    if (cfg.logLevel === 'off' || !hasConsole) return fn();

    // R1 — read the resolved theme from the consoleTransport instance
    const theme = getConsoleTheme(cfg.transports);

    renderGroup(collapsed, label, cfg.namespace, theme);

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

    // Transports, middleware, and config inherited by default.
    // Pass overrides to replace; pass bindings to merge on top of parent's bindings.
    child: (overrides: RuneOptions = {}): Logger =>
      createLogger({
        bindings: { ...ownBindings, ...(overrides.bindings ?? {}) },
        logLevel: overrides.logLevel ?? cfg.logLevel,
        middleware: overrides.middleware ?? cfg.middleware,
        namespace: overrides.namespace ?? cfg.namespace,
        now: overrides.now ?? cfg.now,
        onTransportError: overrides.onTransportError ?? cfg.onTransportError,
        transports: overrides.transports ?? cfg.transports,
      }),

    get config(): Readonly<RuneConfig> {
      return { ...cfg, middleware: [...cfg.middleware], transports: [...cfg.transports] };
    },

    debug: (m: unknown, s?: unknown, t?: unknown) => emit('debug', m, s, t),

    enabled: (type: LogLevel): boolean => passes(type),

    error: (m: unknown, s?: unknown, t?: unknown) => emit('error', m, s, t),

    fatal: (m: unknown, s?: unknown, t?: unknown) => emit('fatal', m, s, t),

    group: (label, fn) => wrapGroup(false, label, fn),

    groupCollapsed: (label, fn) => wrapGroup(true, label, fn),

    info: (m: unknown, s?: unknown, t?: unknown) => emit('info', m, s, t),

    time: timeImpl,

    use: (middleware: LogMiddleware): Logger =>
      createLogger({
        bindings: ownBindings,
        logLevel: cfg.logLevel,
        middleware: [...cfg.middleware, middleware],
        namespace: cfg.namespace,
        now: cfg.now,
        onTransportError: cfg.onTransportError,
        transports: cfg.transports,
      }),

    warn: (m: unknown, s?: unknown, t?: unknown) => emit('warn', m, s, t),

    withBindings: (bindings: Bindings): Logger =>
      createLogger({
        bindings: { ...ownBindings, ...bindings },
        logLevel: cfg.logLevel,
        middleware: cfg.middleware,
        namespace: cfg.namespace,
        now: cfg.now,
        onTransportError: cfg.onTransportError,
        transports: cfg.transports,
      }),
  };

  return logger;
}

export const Rune = createLogger();

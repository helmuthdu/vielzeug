import type { Bindings, LogEntry, LogLevel, LogType, Logger, RuneConfig, RuneOptions, Transport } from './types';

import { resolveBindings } from './lazy';
import { CONSOLE_TRANSPORT_MARKER, PRIORITY, consoleTransport, detectEnv, renderGroup } from './transports';

/* ─── Arg parsing ─── */

function serializeError(err: Error): { message: string; name: string; stack?: string } {
  return { message: err.message, name: err.name, stack: err.stack };
}

function parseArgs(
  msgOrCtx: Bindings | Error | string,
  msg: unknown,
): { context: Bindings | undefined; message: string | undefined } {
  if (msgOrCtx instanceof Error) {
    if (msg !== undefined && typeof msg !== 'string') {
      throw new TypeError('[rune] error override messages must be strings.');
    }

    return {
      context: { err: serializeError(msgOrCtx) },
      message: (msg as string | undefined) ?? msgOrCtx.message,
    };
  }

  if (typeof msgOrCtx === 'string') {
    if (msg !== undefined) {
      throw new TypeError(
        '[rune] string-first log calls accept only one argument. Use log.info({ ... }, "message") for structured context.',
      );
    }

    return { context: undefined, message: msgOrCtx };
  }

  if (msg !== undefined && typeof msg !== 'string') {
    throw new TypeError('[rune] context-first log calls require the optional second argument to be a string message.');
  }

  return { context: msgOrCtx as Bindings, message: msg as string | undefined };
}

/* ─── Config resolution ─── */

function resolveConfig(opts: RuneOptions): RuneConfig {
  return {
    env: opts.env ?? detectEnv(),
    logLevel: opts.logLevel ?? 'debug',
    namespace: opts.namespace ?? '',
    transports: opts.transports ?? [consoleTransport()],
  };
}

/* ─── Group rendering ─── */

function hasConsoleTransport(transports: Transport[]): boolean {
  return transports.some((t) => (t as unknown as Record<symbol, unknown>)[CONSOLE_TRANSPORT_MARKER] === true);
}

/* ─── createLogger ─── */

export function createLogger(initial: RuneOptions | string = {}, initialBindings: Bindings = {}): Logger {
  const initialOpts: RuneOptions = typeof initial === 'string' ? { namespace: initial } : initial;
  const cfg = resolveConfig(initialOpts);
  const ownBindings: Bindings = { ...initialBindings };

  const passes = (type: LogLevel): boolean => PRIORITY[cfg.logLevel] <= PRIORITY[type];
  const hasConsole = hasConsoleTransport(cfg.transports);

  const emit = (type: LogType, msgOrCtx: Bindings | Error | string, msg?: unknown): void => {
    if (!passes(type)) return;

    const { context, message } = parseArgs(msgOrCtx, msg);

    // Resolve lazy bindings only after the level check passes.
    const resolvedBindings = resolveBindings(ownBindings);

    const entry: LogEntry = {
      bindings: resolvedBindings,
      context,
      level: type,
      message,
      namespace: cfg.namespace,
      timestamp: new Date(),
    };

    for (const transport of cfg.transports) {
      try {
        transport(entry);
      } catch (err) {
        console.warn('[rune] transport error:', err);
      }
    }
  };

  // ─── time() — measures execution time and emits a structured debug entry ───
  const timeImpl = <T>(label: string, fn: () => T): T => {
    const start = performance.now();

    const done = (): void => {
      const duration_ms = Math.round((performance.now() - start) * 100) / 100;

      emit('debug', { duration_ms }, `timer: ${label}`);
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

  // ─── group/groupCollapsed — console-only, runs only when a consoleTransport is configured ───
  const wrapGroup = <T>(collapsed: boolean, label: string, fn: () => T): T => {
    if (cfg.logLevel === 'off' || !hasConsole) return fn();

    renderGroup(collapsed, label, cfg.namespace);

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

    // Transports inherited by default; pass transports: [] to opt out.
    child: (overrides: RuneOptions = {}): Logger =>
      createLogger(
        {
          env: overrides.env ?? cfg.env,
          logLevel: overrides.logLevel ?? cfg.logLevel,
          namespace: overrides.namespace ?? cfg.namespace,
          transports: overrides.transports ?? cfg.transports,
        },
        ownBindings,
      ),

    get config(): Readonly<RuneConfig> {
      return { ...cfg, transports: [...cfg.transports] };
    },

    debug: (m: Bindings | Error | string, s?: string) => emit('debug', m, s),

    enabled: (type: LogLevel): boolean => passes(type),

    error: (m: Bindings | Error | string, s?: string) => emit('error', m, s),

    fatal: (m: Bindings | Error | string, s?: string) => emit('fatal', m, s),

    group: (label, fn) => wrapGroup(false, label, fn),

    groupCollapsed: (label, fn) => wrapGroup(true, label, fn),

    info: (m: Bindings | Error | string, s?: string) => emit('info', m, s),

    scope: (name: string): Logger => logger.child({ namespace: cfg.namespace ? `${cfg.namespace}.${name}` : name }),

    time: timeImpl,

    warn: (m: Bindings | Error | string, s?: string) => emit('warn', m, s),

    withBindings: (bindings: Bindings): Logger =>
      createLogger(
        { env: cfg.env, logLevel: cfg.logLevel, namespace: cfg.namespace, transports: cfg.transports },
        { ...ownBindings, ...bindings },
      ),
  };

  return logger;
}

export const Rune = createLogger();

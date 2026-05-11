/* -------------------- Types -------------------- */

export type LogType = 'debug' | 'trace' | 'info' | 'warn' | 'error' | 'fatal';
export type LogLevel = LogType | 'off';
export type Variant = 'text' | 'symbol' | 'icon';
export type Bindings = Record<string, unknown>;

export type RemoteHandler = (type: LogType, data: RemoteLogData) => void;

export type RemoteOptions = { handler?: RemoteHandler; logLevel?: LogLevel };

export type SerializedError = {
  message: string;
  name: string;
  stack?: string;
};

export type RemoteLogData = {
  context?: Bindings;
  env: 'production' | 'development';
  level: LogType;
  message?: string;
  namespace?: string;
  timestamp?: string;
};

export type LogitOptions = {
  logLevel?: LogLevel;
  namespace?: string;
  remote?: RemoteOptions;
  timestamp?: boolean;
  variant?: Variant;
};

/** The shape of a fully resolved logger config (all fields present). */
type ResolvedRemote = { handler?: RemoteHandler; logLevel: LogLevel };
export type LogitConfig = Omit<Required<LogitOptions>, 'remote'> & { remote: ResolvedRemote };

export type Logger = {
  assert: (condition: boolean, ...args: unknown[]) => void;
  readonly bindings: Readonly<Bindings>;
  /** Create a config-only child (overrides logLevel, namespace, etc.) */
  child: (overrides?: LogitOptions) => Logger;
  readonly config: Readonly<LogitConfig>;
  debug: (msgOrCtx?: string | Bindings, msg?: string) => void;
  enabled: (type: LogLevel) => boolean;
  error: (msgOrCtx?: string | Bindings | Error, msg?: string) => void;
  fatal: (msgOrCtx?: string | Bindings | Error, msg?: string) => void;
  group: <T>(label: string, fn: () => T) => T;
  groupCollapsed: <T>(label: string, fn: () => T) => T;
  info: (msgOrCtx?: string | Bindings, msg?: string) => void;
  scope: (name: string) => Logger;
  setConfig: (opts: LogitOptions) => Logger;
  table: (data: unknown, properties?: string[]) => void;
  time: <T>(label: string, fn: () => T) => T;
  trace: (msgOrCtx?: string | Bindings, msg?: string) => void;
  warn: (msgOrCtx?: string | Bindings | Error, msg?: string) => void;
  /** Create a child with pinned context fields emitted on every log line */
  withBindings: (bindings: Bindings) => Logger;
};

/* -------------------- Priority -------------------- */

const PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  error: 5,
  fatal: 6,
  info: 2,
  off: 7,
  trace: 1,
  warn: 4,
};

/* -------------------- Theme -------------------- */

type Theme = { bg: string; border: string; color: string; icon?: string; symbol?: string };

const THEME: Record<LogType | 'group' | 'ns', Theme> = {
  debug: { bg: '#616161', border: '#424242', color: '#fff', icon: '☕', symbol: '🅳' },
  error: { bg: '#d32f2f', border: '#c62828', color: '#fff', icon: '✘', symbol: '🅴' },
  fatal: { bg: '#4a148c', border: '#38006b', color: '#fff', icon: '💀', symbol: '🅵' },
  group: { bg: '#546e7a', border: '#455a64', color: '#fff', icon: '⚭', symbol: '🅶' },
  info: { bg: '#1976d2', border: '#1565c0', color: '#fff', icon: 'ℹ', symbol: '🅸' },
  ns: { bg: '#424242', border: '#212121', color: '#fff' },
  trace: { bg: '#d81b60', border: '#c2185b', color: '#fff', icon: '⛢', symbol: '🆃' },
  warn: { bg: '#ffb300', border: '#ffa000', color: '#fff', icon: '⚠', symbol: '🆆' },
};

const NS_STYLE = 'border-radius: 8px; font: italic small-caps bold 12px; font-weight: lighter; padding: 0 4px;';

/* -------------------- Env -------------------- */

const IS_NODE = typeof window === 'undefined';
const NODE_PROCESS = (globalThis as typeof globalThis & { process?: { env?: { NODE_ENV?: string } } }).process;
const IS_PROD = IS_NODE ? NODE_PROCESS?.env?.NODE_ENV === 'production' : (import.meta as ImportMeta).env.PROD;

const LOG_METHOD: Record<LogType, 'log' | 'info' | 'warn' | 'error' | 'trace'> = {
  debug: 'log',
  error: 'error',
  fatal: 'error',
  info: 'info',
  trace: 'trace',
  warn: 'warn',
};

/* -------------------- Argument parsing -------------------- */

/** Serialize an Error into a plain object that survives JSON.stringify. */
function serializeError(err: Error): SerializedError {
  return { message: err.message, name: err.name, stack: err.stack };
}

/**
 * Parse the variadic call signature into a structured { message, context }.
 *
 * Supported call forms:
 *   log.info()
 *   log.info('message')
 *   log.info({ key: 'val' }, 'message')
 *   log.error(new Error('boom'))              → context.err = SerializedError, message = err.message
 *   log.error(new Error('boom'), 'override')  → message overridden, context.err kept
 */
function parseArgs(
  msgOrCtx: string | Bindings | Error | undefined,
  msg: string | undefined,
): { context: Bindings | undefined; message: string | undefined } {
  if (msgOrCtx === undefined) return { context: undefined, message: undefined };

  if (msgOrCtx instanceof Error) {
    return {
      context: { err: serializeError(msgOrCtx) },
      message: msg ?? msgOrCtx.message,
    };
  }

  if (typeof msgOrCtx === 'string') {
    return { context: undefined, message: msgOrCtx };
  }

  return { context: msgOrCtx as Bindings, message: msg };
}

/* -------------------- createLogger -------------------- */

/**
 * Creates an independent logger instance with its own isolated configuration.
 *
 * @example
 * ```ts
 * const log = createLogger({ logLevel: 'info', namespace: 'App' });
 * log.info('server started');
 * log.info({ port: 3000 }, 'listening');
 * log.error(new Error('boom'));
 *
 * const reqLog = log.withBindings({ requestId: 'abc-123' });
 * reqLog.info('GET /users');  // always includes requestId
 * ```
 */
export function createLogger(initial: LogitOptions | string = {}, initialBindings: Bindings = {}): Logger {
  const opts: LogitOptions = typeof initial === 'string' ? { namespace: initial } : initial;
  const cfg: LogitConfig = {
    logLevel: 'debug',
    namespace: '',
    timestamp: true,
    variant: 'symbol',
    ...opts,
    remote: { logLevel: 'debug', ...opts.remote },
  };

  // Pinned context fields merged into every emission
  const ownBindings: Bindings = { ...initialBindings };

  /* ---- helpers ---- */

  const passes = (type: LogLevel): boolean => PRIORITY[cfg.logLevel] <= PRIORITY[type];

  const ts = (): string => new Date().toISOString().slice(11, 23);

  const badge = (type: LogType | 'group'): string => {
    const theme = THEME[type];

    if (cfg.variant === 'text' || !theme[cfg.variant]) return type.toUpperCase();

    return theme[cfg.variant]!;
  };

  const style = (type: LogType | 'group' | 'ns', extra = ''): string => {
    const { bg, border, color } = THEME[type];
    const base = `border: 1px solid ${border}; border-radius: 4px`;

    switch (cfg.variant) {
      case 'icon':
        return `color: ${bg}; ${base}; padding: 0 3px${extra}`;
      case 'symbol':
        return `color: ${bg}; ${base}; padding: 0 1px${extra}`;
      default:
        return `background: ${bg}; color: ${color}; ${base}; font-weight: bold; padding: 0 3px${extra}`;
    }
  };

  const mergeContext = (callCtx: Bindings | undefined): Bindings | undefined => {
    const hasOwn = Object.keys(ownBindings).length > 0;

    if (!hasOwn && !callCtx) return undefined;

    return { ...ownBindings, ...callCtx };
  };

  const buildConsolePayload = (message: string | undefined, context: Bindings | undefined): unknown[] => {
    const merged = mergeContext(context);
    const out: unknown[] = [];

    if (merged) out.push(merged);

    if (message !== undefined) out.push(message);

    if (out.length === 0) out.push(undefined);

    return out;
  };

  const buildEmitPrefix = (type: LogType, ns: string, stamp: string): { fmt: string; parts: string[] } => {
    if (IS_NODE) {
      const meta = [badge(type)];

      if (ns) meta.push(`[${ns}]`);

      if (stamp) meta.push(stamp);

      return { fmt: `${meta.join(' | ')} |`, parts: [] };
    }

    let fmt = `%c${badge(type)}%c`;
    const parts: string[] = [style(type), ''];

    if (ns) {
      fmt += ` %c${ns}%c`;
      parts.push(style('ns', `; ${NS_STYLE}`), '');
    }

    if (stamp) {
      fmt += ` %c${stamp}%c`;
      parts.push('color: gray', '');
    }

    return { fmt, parts };
  };

  const emitConsole = (
    type: LogType,
    ns: string,
    stamp: string,
    message: string | undefined,
    context: Bindings | undefined,
  ): void => {
    const { fmt, parts } = buildEmitPrefix(type, ns, stamp);
    const method = console[LOG_METHOD[type]] as (...a: unknown[]) => void;

    method(fmt, ...parts, ...buildConsolePayload(message, context));
  };

  const emit = (type: LogType, msgOrCtx: string | Bindings | Error | undefined, msg: string | undefined): void => {
    if (!passes(type)) return;

    const { context, message } = parseArgs(msgOrCtx, msg);
    const ns = cfg.namespace;
    const stamp = cfg.timestamp ? ts() : '';

    emitConsole(type, ns, stamp, message, context);

    /* remote dispatch — snapshot now, fire in microtask */
    const { handler, logLevel } = cfg.remote;

    if (handler && PRIORITY[logLevel] <= PRIORITY[type]) {
      const data: RemoteLogData = {
        context: mergeContext(context),
        env: IS_PROD ? 'production' : 'development',
        level: type,
        message,
        namespace: ns || undefined,
        timestamp: cfg.timestamp ? new Date().toISOString() : undefined,
      };

      Promise.resolve()
        .then(() => handler(type, data))
        .catch((err: unknown) => {
          console.warn('[logit] remote handler error:', err);
        });
    }
  };

  const timeLabel = (label: string): string => (cfg.namespace ? `[${cfg.namespace}] ${label}` : label);

  const renderGroup = (collapsed: boolean, label: string): void => {
    const ns = cfg.namespace;
    const stamp = cfg.timestamp ? ts() : '';
    const fn = collapsed ? console.groupCollapsed : console.group;

    if (IS_NODE) {
      const meta = [badge('group'), label];

      if (ns) meta.push(`[${ns}]`);

      if (stamp) meta.push(stamp);

      fn(meta.join(' | '));

      return;
    }

    let fmt = `%c${label}%c`;
    const parts: string[] = [style('group', '; margin-right: 6px; padding: 1px 3px 0'), ''];

    if (ns) {
      fmt += ` %c${ns}%c`;
      parts.push(style('ns', `; ${NS_STYLE}; margin-right: 6px`), '');
    }

    if (stamp) {
      fmt += ` %c${stamp}%c`;
      parts.push('color: gray; font-weight: lighter; margin-right: 6px', '');
    }

    fn(fmt, ...parts);
  };

  const wrapGroup = <T>(collapsed: boolean, label: string, fn: () => T): T => {
    if (cfg.logLevel === 'off') return fn();

    renderGroup(collapsed, label);

    try {
      const result = fn();

      if (result instanceof Promise) return result.finally(() => console.groupEnd()) as T;

      console.groupEnd();

      return result;
    } catch (e) {
      console.groupEnd();
      throw e;
    }
  };

  /* ---- public API ---- */

  const logger: Logger = {
    assert: (condition: boolean, ...args: unknown[]): void => {
      if (!passes('error')) return;

      if (cfg.namespace) {
        console.assert(condition, `[${cfg.namespace}]`, ...args);

        return;
      }

      console.assert(condition, ...args);
    },

    get bindings(): Readonly<Bindings> {
      return { ...ownBindings };
    },

    child: (overrides: LogitOptions = {}): Logger => {
      const { remote: overrideRemote, ...overrideRest } = overrides;

      return createLogger({ ...cfg, ...overrideRest, remote: { ...cfg.remote, ...overrideRemote } }, ownBindings);
    },

    get config(): Readonly<LogitConfig> {
      return { ...cfg, remote: { ...cfg.remote } };
    },

    debug: (m?, s?) => emit('debug', m, s),

    enabled: (type: LogLevel): boolean => passes(type),
    error: (m?, s?) => emit('error', m as string | Bindings | Error | undefined, s),
    fatal: (m?, s?) => emit('fatal', m as string | Bindings | Error | undefined, s),

    group: (label, fn) => wrapGroup(false, label, fn),

    groupCollapsed: (label, fn) => wrapGroup(true, label, fn),
    info: (m?, s?) => emit('info', m, s),

    scope: (name: string): Logger => logger.child({ namespace: cfg.namespace ? `${cfg.namespace}.${name}` : name }),

    setConfig: (opts: LogitOptions): Logger => {
      const { remote, ...rest } = opts;

      if (remote !== undefined) Object.assign(cfg.remote, remote);

      Object.assign(cfg, rest);

      return logger;
    },

    table: (data: unknown, properties?: string[]): void => {
      if (!passes('debug')) return;

      if (cfg.namespace) {
        console.group(`[${cfg.namespace}]`);
        console.table(data, properties);
        console.groupEnd();

        return;
      }

      console.table(data, properties);
    },

    time: <T>(label: string, fn: () => T): T => {
      if (cfg.logLevel === 'off') return fn();

      const tl = timeLabel(label);

      console.time(tl);

      try {
        const result = fn();

        if (result instanceof Promise) return result.finally(() => console.timeEnd(tl)) as T;

        console.timeEnd(tl);

        return result;
      } catch (e) {
        console.timeEnd(tl);
        throw e;
      }
    },

    trace: (m?, s?) => emit('trace', m, s),

    warn: (m?, s?) => emit('warn', m as string | Bindings | Error | undefined, s),
    withBindings: (bindings: Bindings): Logger => createLogger(cfg, { ...ownBindings, ...bindings }),
  };

  return logger;
}

/* -------------------- Default instance -------------------- */

/**
 * Shared default logger instance. For isolated configurations use `createLogger()`.
 *
 * @example
 * ```ts
 * import { Logit } from '@vielzeug/logit';
 * Logit.info('Hello');
 * Logit.error(new Error('boom'));
 * Logit.fatal({ requestId: 'x' }, 'unrecoverable');
 * ```
 */
export const Logit = createLogger();

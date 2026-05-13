/* -------------------- Types -------------------- */

export type LogType = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type LogLevel = LogType | 'off';
export type Variant = 'text' | 'symbol' | 'icon';
export type Bindings = Record<string, unknown>;

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

export type RemoteHandler = (type: LogType, data: RemoteLogData) => void;

export type RemoteOptions = {
  handler?: RemoteHandler;
  logLevel?: LogLevel;
};

export type LogitOptions = {
  logLevel?: LogLevel;
  namespace?: string;
  remote?: RemoteOptions | null;
  timestamp?: boolean;
  variant?: Variant;
};

export type LogitConfig = {
  logLevel: LogLevel;
  namespace: string;
  remote?: {
    handler: RemoteHandler;
    logLevel: LogLevel;
  };
  timestamp: boolean;
  variant: Variant;
};

type LogMethod = {
  (): void;
  (message: string): void;
  (context: Bindings, message?: string): void;
  (error: Error, message?: string): void;
};

export type Logger = {
  readonly bindings: Readonly<Bindings>;
  child: (overrides?: LogitOptions) => Logger;
  readonly config: Readonly<LogitConfig>;
  debug: LogMethod;
  enabled: (type: LogLevel) => boolean;
  error: LogMethod;
  fatal: LogMethod;
  group: <T>(label: string, fn: () => T) => T;
  groupCollapsed: <T>(label: string, fn: () => T) => T;
  info: LogMethod;
  scope: (name: string) => Logger;
  time: <T>(label: string, fn: () => T) => T;
  warn: LogMethod;
  withBindings: (bindings: Bindings) => Logger;
};

/* -------------------- Constants -------------------- */

const PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  error: 3,
  fatal: 4,
  info: 1,
  off: 5,
  warn: 2,
};

type Theme = { bg: string; border: string; color: string; icon?: string; symbol?: string };

const THEME: Record<LogType | 'group' | 'ns', Theme> = {
  debug: { bg: '#616161', border: '#424242', color: '#fff', icon: '☕', symbol: '🅳' },
  error: { bg: '#d32f2f', border: '#c62828', color: '#fff', icon: '✘', symbol: '🅴' },
  fatal: { bg: '#4a148c', border: '#38006b', color: '#fff', icon: '💀', symbol: '🅵' },
  group: { bg: '#546e7a', border: '#455a64', color: '#fff', icon: '⚭', symbol: '🅶' },
  info: { bg: '#1976d2', border: '#1565c0', color: '#fff', icon: 'ℹ', symbol: '🅸' },
  ns: { bg: '#424242', border: '#212121', color: '#fff' },
  warn: { bg: '#ffb300', border: '#ffa000', color: '#fff', icon: '⚠', symbol: '🆆' },
};

const NS_STYLE = 'border-radius: 8px; font: italic small-caps bold 12px; font-weight: lighter; padding: 0 4px;';

const IS_NODE = typeof window === 'undefined';
const NODE_PROCESS = (globalThis as typeof globalThis & { process?: { env?: { NODE_ENV?: string } } }).process;
const IS_PROD = IS_NODE ? NODE_PROCESS?.env?.NODE_ENV === 'production' : (import.meta as ImportMeta).env.PROD;

const LOG_METHOD: Record<LogType, 'log' | 'info' | 'warn' | 'error'> = {
  debug: 'log',
  error: 'error',
  fatal: 'error',
  info: 'info',
  warn: 'warn',
};

/* -------------------- Pure Helpers -------------------- */

function serializeError(err: Error): SerializedError {
  return { message: err.message, name: err.name, stack: err.stack };
}

function failInvalidArgs(message: string): never {
  throw new TypeError(`[logit] ${message}`);
}

function parseArgs(
  msgOrCtx: string | Bindings | Error | undefined,
  msg: unknown,
): { context: Bindings | undefined; message: string | undefined } {
  if (msgOrCtx === undefined) return { context: undefined, message: undefined };

  if (msgOrCtx instanceof Error) {
    if (msg !== undefined && typeof msg !== 'string') {
      failInvalidArgs('error override messages must be strings.');
    }

    return {
      context: { err: serializeError(msgOrCtx) },
      message: (msg as string | undefined) ?? msgOrCtx.message,
    };
  }

  if (typeof msgOrCtx === 'string') {
    if (msg !== undefined) {
      failInvalidArgs('string-first log calls accept only one argument. Use log.info({ ... }, \"message\") for structured context.');
    }

    return { context: undefined, message: msgOrCtx };
  }

  if (msg !== undefined && typeof msg !== 'string') {
    failInvalidArgs('context-first log calls require the optional second argument to be a string message.');
  }

  return { context: msgOrCtx as Bindings, message: msg as string | undefined };
}

function badge(type: LogType | 'group', variant: Variant): string {
  const theme = THEME[type];

  if (variant === 'text' || !theme[variant]) return type.toUpperCase();

  return theme[variant]!;
}

function style(type: LogType | 'group' | 'ns', variant: Variant, extra = ''): string {
  const { bg, border, color } = THEME[type];
  const base = `border: 1px solid ${border}; border-radius: 4px`;

  switch (variant) {
    case 'icon':
      return `color: ${bg}; ${base}; padding: 0 3px${extra}`;
    case 'symbol':
      return `color: ${bg}; ${base}; padding: 0 1px${extra}`;
    default:
      return `background: ${bg}; color: ${color}; ${base}; font-weight: bold; padding: 0 3px${extra}`;
  }
}

function mergeContext(base: Bindings, callCtx: Bindings | undefined): Bindings | undefined {
  const hasBase = Object.keys(base).length > 0;

  if (!hasBase && !callCtx) return undefined;

  return { ...base, ...callCtx };
}

function buildPayload(mergedContext: Bindings | undefined, message: string | undefined): unknown[] {
  if (mergedContext && message !== undefined) return [mergedContext, message];

  if (mergedContext) return [mergedContext];

  if (message !== undefined) return [message];

  return [];
}

function buildNodePrefix(type: LogType, namespace: string, timestamp: string, variant: Variant): string {
  const meta = [badge(type, variant)];

  if (namespace) meta.push(`[${namespace}]`);

  if (timestamp) meta.push(timestamp);

  return `${meta.join(' | ')} |`;
}

function buildBrowserPrefix(
  type: LogType,
  namespace: string,
  timestamp: string,
  variant: Variant,
): { fmt: string; parts: string[] } {
  let fmt = `%c${badge(type, variant)}%c`;
  const parts: string[] = [style(type, variant), ''];

  if (namespace) {
    fmt += ` %c${namespace}%c`;
    parts.push(style('ns', variant, `; ${NS_STYLE}`), '');
  }

  if (timestamp) {
    fmt += ` %c${timestamp}%c`;
    parts.push('color: gray', '');
  }

  return { fmt, parts };
}

function toTimeLabel(namespace: string, label: string): string {
  return namespace ? `[${namespace}] ${label}` : label;
}

function resolveRemote(
  remote: LogitOptions['remote'],
  inherited?: LogitConfig['remote'],
): LogitConfig['remote'] | undefined {
  if (remote === undefined) return inherited ? { ...inherited } : undefined;

  if (remote === null) return undefined;

  const handler = remote.handler ?? inherited?.handler;

  if (!handler) {
    if (remote.logLevel !== undefined) {
      throw new Error('[logit] remote.logLevel requires a remote.handler (or inherited handler via child())');
    }

    return undefined;
  }

  return {
    handler,
    logLevel: remote.logLevel ?? inherited?.logLevel ?? 'debug',
  };
}

function resolveConfig(opts: LogitOptions): LogitConfig {
  const namespace = opts.namespace ?? '';
  const logLevel = opts.logLevel ?? 'debug';
  const remote = resolveRemote(opts.remote);
  const timestamp = opts.timestamp ?? true;
  const variant = opts.variant ?? 'symbol';

  return remote ? { logLevel, namespace, remote, timestamp, variant } : { logLevel, namespace, timestamp, variant };
}

/* -------------------- createLogger -------------------- */

export function createLogger(initial: LogitOptions | string = {}, initialBindings: Bindings = {}): Logger {
  const initialOpts: LogitOptions = typeof initial === 'string' ? { namespace: initial } : initial;
  const cfg = resolveConfig(initialOpts);
  const ownBindings: Bindings = { ...initialBindings };

  const passes = (type: LogLevel): boolean => PRIORITY[cfg.logLevel] <= PRIORITY[type];

  const ts = (): string => new Date().toISOString().slice(11, 23);

  const emit = (type: LogType, msgOrCtx?: string | Bindings | Error, msg?: unknown): void => {
    if (!passes(type)) return;

    const { context, message } = parseArgs(msgOrCtx, msg);

    if (context === undefined && message === undefined) return;

    const namespace = cfg.namespace;
    const timestamp = cfg.timestamp ? ts() : '';
    const mergedContext = mergeContext(ownBindings, context);
    const payload = buildPayload(mergedContext, message);
    const method = console[LOG_METHOD[type]] as (...a: unknown[]) => void;

    if (IS_NODE) {
      method(buildNodePrefix(type, namespace, timestamp, cfg.variant), ...payload);
    } else {
      const { fmt, parts } = buildBrowserPrefix(type, namespace, timestamp, cfg.variant);

      method(fmt, ...parts, ...payload);
    }

    if (!cfg.remote) return;

    if (PRIORITY[cfg.remote.logLevel] > PRIORITY[type]) return;

    const data: RemoteLogData = {
      context: mergedContext,
      env: IS_PROD ? 'production' : 'development',
      level: type,
      message,
      namespace: namespace || undefined,
      timestamp: cfg.timestamp ? new Date().toISOString() : undefined,
    };

    Promise.resolve()
      .then(() => cfg.remote!.handler(type, data))
      .catch((err: unknown) => {
        console.warn('[logit] remote handler error:', err);
      });
  };

  const renderGroup = (collapsed: boolean, label: string): void => {
    const namespace = cfg.namespace;
    const timestamp = cfg.timestamp ? ts() : '';
    const fn = collapsed ? console.groupCollapsed : console.group;

    if (IS_NODE) {
      const meta = [badge('group', cfg.variant), label];

      if (namespace) meta.push(`[${namespace}]`);

      if (timestamp) meta.push(timestamp);

      fn(meta.join(' | '));

      return;
    }

    let fmt = `%c${label}%c`;
    const parts: string[] = [style('group', cfg.variant, '; margin-right: 6px; padding: 1px 3px 0'), ''];

    if (namespace) {
      fmt += ` %c${namespace}%c`;
      parts.push(style('ns', cfg.variant, `; ${NS_STYLE}; margin-right: 6px`), '');
    }

    if (timestamp) {
      fmt += ` %c${timestamp}%c`;
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
    } catch (err) {
      console.groupEnd();
      throw err;
    }
  };

  const logger: Logger = {
    get bindings(): Readonly<Bindings> {
      return { ...ownBindings };
    },

    child: (overrides: LogitOptions = {}): Logger => {
      const remote = resolveRemote(overrides.remote, cfg.remote);

      return createLogger(
        {
          logLevel: overrides.logLevel ?? cfg.logLevel,
          namespace: overrides.namespace ?? cfg.namespace,
          remote,
          timestamp: overrides.timestamp ?? cfg.timestamp,
          variant: overrides.variant ?? cfg.variant,
        },
        ownBindings,
      );
    },

    get config(): Readonly<LogitConfig> {
      return cfg.remote ? { ...cfg, remote: { ...cfg.remote } } : { ...cfg };
    },

    debug: (m?, s?) => emit('debug', m, s),

    enabled: (type: LogLevel): boolean => passes(type),

    error: (m?, s?) => emit('error', m, s),

    fatal: (m?, s?) => emit('fatal', m, s),

    group: (label, fn) => wrapGroup(false, label, fn),

    groupCollapsed: (label, fn) => wrapGroup(true, label, fn),

    info: (m?, s?) => emit('info', m, s),

    scope: (name: string): Logger => logger.child({ namespace: cfg.namespace ? `${cfg.namespace}.${name}` : name }),

    time: <T>(label: string, fn: () => T): T => {
      if (cfg.logLevel === 'off') return fn();

      const tl = toTimeLabel(cfg.namespace, label);

      console.time(tl);

      try {
        const result = fn();

        if (result instanceof Promise) return result.finally(() => console.timeEnd(tl)) as T;

        console.timeEnd(tl);

        return result;
      } catch (err) {
        console.timeEnd(tl);
        throw err;
      }
    },

    warn: (m?, s?) => emit('warn', m, s),

    withBindings: (bindings: Bindings): Logger => createLogger(cfg, { ...ownBindings, ...bindings }),
  };

  return logger;
}

export const Logit = createLogger();

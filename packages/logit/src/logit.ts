/* -------------------- Types -------------------- */

export type LogType = 'debug' | 'trace' | 'info' | 'success' | 'warn' | 'error';
export type LogLevel = LogType | 'off';
export type Variant = 'text' | 'symbol' | 'icon';

export type RemoteHandler = (type: LogType, data: RemoteLogData) => void;

export type RemoteOptions = { handler?: RemoteHandler; logLevel?: LogLevel };

export type RemoteLogData = {
  args: unknown[];
  env: 'production' | 'development';
  namespace?: string;
  timestamp?: string;
};

export type LogitOptions = {
  environment?: boolean;
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
  child: (overrides?: LogitOptions) => Logger;
  readonly config: Readonly<LogitConfig>;
  debug: (...args: unknown[]) => void;
  enabled: (type: LogLevel) => boolean;
  error: (...args: unknown[]) => void;
  group: <T>(label: string, fn: () => T, collapsed?: boolean) => T;
  info: (...args: unknown[]) => void;
  scope: (name: string) => Logger;
  setConfig: (opts: LogitOptions) => Logger;
  success: (...args: unknown[]) => void;
  table: (data: unknown, properties?: string[]) => void;
  time: <T>(label: string, fn: () => T) => T;
  trace: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};

/* -------------------- Priority -------------------- */

const PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  error: 5,
  info: 2,
  off: 6,
  success: 3,
  trace: 1,
  warn: 4,
};

/* -------------------- Theme -------------------- */

type Theme = { bg: string; border: string; color: string; icon?: string; symbol?: string };

const isDarkMode = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

const THEME: Record<LogType | 'group' | 'ns', Theme> = {
  debug: { bg: '#616161', border: '#424242', color: '#fff', icon: '☕', symbol: '🅳' },
  error: { bg: '#d32f2f', border: '#c62828', color: '#fff', icon: '✘', symbol: '🅴' },
  group: { bg: '#546e7a', border: '#455a64', color: '#fff', icon: '⚭', symbol: '🅶' },
  info: { bg: '#1976d2', border: '#1565c0', color: '#fff', icon: 'ℹ', symbol: '🅸' },
  ns: isDarkMode
    ? { bg: '#fafafa', border: '#c7c7c7', color: '#000' }
    : { bg: '#424242', border: '#212121', color: '#fff' },
  success: { bg: '#689f38', border: '#558b2f', color: '#fff', icon: '✔', symbol: '🆂' },
  trace: { bg: '#d81b60', border: '#c2185b', color: '#fff', icon: '⛢', symbol: '🆃' },
  warn: { bg: '#ffb300', border: '#ffa000', color: '#fff', icon: '⚠', symbol: '🆆' },
};

const NS_STYLE = 'border-radius: 8px; font: italic small-caps bold 12px; font-weight: lighter; padding: 0 4px;';

/* -------------------- createLogger -------------------- */

const IS_NODE = typeof window === 'undefined';
const IS_PROD = IS_NODE
  ? // @ts-expect-error - process is Node-only
    (process as any).env?.NODE_ENV === 'production'
  : (import.meta as any)?.env?.NODE_ENV === 'production';

const ENV_BADGE = IS_PROD ? '🅿' : '🅳';

const LOG_METHOD: Record<LogType, 'log' | 'info' | 'warn' | 'error' | 'trace'> = {
  debug: 'log',
  error: 'error',
  info: 'info',
  success: 'log',
  trace: 'trace',
  warn: 'warn',
};

/**
 * Creates an independent logger instance with its own isolated configuration.
 *
 * @example
 * ```ts
 * const log = createLogger({ logLevel: 'info', namespace: 'App' });
 * log.info('Hello');
 *
 * const apiLog = log.scope('api');
 * apiLog.warn('slow request');
 * ```
 */
export function createLogger(initial: LogitOptions | string = {}): Logger {
  const opts: LogitOptions = typeof initial === 'string' ? { namespace: initial } : initial;
  const cfg: LogitConfig = {
    environment: true,
    logLevel: 'debug',
    namespace: '',
    timestamp: true,
    variant: 'symbol',
    ...opts,
    remote: { logLevel: 'debug', ...opts.remote }, // 'debug' default means a handler just works; set 'off' explicitly to disable
  };

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

  const emitNode = (type: LogType, ns: string, stamp: string, args: unknown[]): void => {
    const meta = [badge(type)];

    if (cfg.environment) meta.push(ENV_BADGE);

    if (ns) meta.push(`[${ns}]`);

    if (stamp) meta.push(stamp);

    const method = console[LOG_METHOD[type]] as (...a: unknown[]) => void;

    method(`${meta.join(' | ')} |`, ...args);
  };

  const emitBrowser = (type: LogType, ns: string, stamp: string, args: unknown[]): void => {
    let fmt = `%c${badge(type)}%c`;
    const parts: string[] = [style(type), ''];

    if (ns) {
      fmt += ` %c${ns}%c`;
      parts.push(style('ns', `; ${NS_STYLE}`), '');
    }

    if (cfg.environment) {
      fmt += ` %c${ENV_BADGE}%c`;
      parts.push('color: darkgray', '');
    }

    if (stamp) {
      fmt += ` %c${stamp}%c`;
      parts.push('color: gray', '');
    }

    const method = console[LOG_METHOD[type]] as (...a: unknown[]) => void;

    method(fmt, ...parts, ...args);
  };

  const emit = (type: LogType, args: unknown[]): void => {
    if (!passes(type)) return;

    const ns = cfg.namespace;
    const stamp = cfg.timestamp ? ts() : '';

    if (IS_NODE) emitNode(type, ns, stamp, args);
    else emitBrowser(type, ns, stamp, args);

    /* remote dispatch — snapshot data now, dispatch in microtask to avoid blocking caller */
    const { handler, logLevel } = cfg.remote;

    if (handler && PRIORITY[logLevel] <= PRIORITY[type]) {
      const data: RemoteLogData = {
        args,
        env: IS_PROD ? 'production' : 'development',
        namespace: ns || undefined,
        timestamp: cfg.timestamp ? new Date().toISOString() : undefined,
      };

      Promise.resolve()
        .then(() => handler(type, data))
        .catch(() => {});
    }
  };

  const timeLabel = (label: string): string => (cfg.namespace ? `[${cfg.namespace}] ${label}` : label);

  /* ---- child factory ---- */
  const makeChild = (overrides: LogitOptions = {}): Logger => {
    const { remote: overrideRemote, ...overrideRest } = overrides;

    return createLogger({ ...cfg, ...overrideRest, remote: { ...cfg.remote, ...overrideRemote } });
  };

  /* ---- group renderer ---- */

  const renderGroupNode = (collapsed: boolean, label: string, ns: string, stamp: string): void => {
    const fn = collapsed ? console.groupCollapsed : console.group;
    const meta = [badge('group')];

    if (cfg.environment) meta.push(ENV_BADGE);

    meta.push(label);

    if (ns) meta.push(`[${ns}]`);

    if (stamp) meta.push(stamp);

    fn(meta.join(' | '));
  };

  const renderGroupBrowser = (collapsed: boolean, label: string, ns: string, stamp: string): void => {
    const fn = collapsed ? console.groupCollapsed : console.group;
    let fmt = `%c${label}%c`;
    const parts: string[] = [style('group', '; margin-right: 6px; padding: 1px 3px 0'), ''];

    if (ns) {
      fmt += ` %c${ns}%c`;
      parts.push(style('ns', `; ${NS_STYLE}; margin-right: 6px`), '');
    }

    if (cfg.environment) {
      fmt += ` %c${ENV_BADGE}%c`;
      parts.push('color: darkgray; margin-right: 6px', '');
    }

    if (stamp) {
      fmt += ` %c${stamp}%c`;
      parts.push('color: gray; font-weight: lighter; margin-right: 6px', '');
    }

    fn(fmt, ...parts);
  };

  const renderGroup = (collapsed: boolean, label: string): void => {
    const ns = cfg.namespace;
    const stamp = cfg.timestamp ? ts() : '';

    if (IS_NODE) renderGroupNode(collapsed, label, ns, stamp);
    else renderGroupBrowser(collapsed, label, ns, stamp);
  };

  /* ---- public API ---- */

  const logger: Logger = {
    assert: (condition: boolean, ...args: unknown[]): void => {
      if (passes('error')) console.assert(condition, ...args);
    },

    child: makeChild,

    get config(): Readonly<LogitConfig> {
      return { ...cfg, remote: { ...cfg.remote } };
    },

    debug: (...a) => emit('debug', a),

    enabled: (type: LogLevel): boolean => passes(type),
    error: (...a) => emit('error', a),

    group: <T>(label: string, fn: () => T, collapsed = false): T => {
      if (!passes('debug')) return fn();

      renderGroup(collapsed, label);

      try {
        const result = fn();

        if (result instanceof Promise) {
          return result.finally(() => console.groupEnd()) as T;
        }

        console.groupEnd();

        return result;
      } catch (e) {
        console.groupEnd();
        throw e;
      }
    },

    info: (...a) => emit('info', a),

    scope: (name: string): Logger => makeChild({ namespace: cfg.namespace ? `${cfg.namespace}.${name}` : name }),

    setConfig: (opts: LogitOptions): Logger => {
      const { remote, ...rest } = opts;

      if (remote !== undefined) Object.assign(cfg.remote, remote);

      Object.assign(cfg, rest);

      return logger;
    },
    success: (...a) => emit('success', a),

    table: (data: unknown, properties?: string[]): void => {
      if (passes('debug')) console.table(data, properties);
    },

    time: <T>(label: string, fn: () => T): T => {
      if (!passes('debug')) return fn();

      const tl = timeLabel(label);

      console.time(tl);

      try {
        const result = fn();

        if (result instanceof Promise) {
          return result.finally(() => console.timeEnd(tl)) as T;
        }

        console.timeEnd(tl);

        return result;
      } catch (e) {
        console.timeEnd(tl);
        throw e;
      }
    },

    trace: (...a) => emit('trace', a),
    warn: (...a) => emit('warn', a),
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
 * ```
 */
export const Logit = createLogger();

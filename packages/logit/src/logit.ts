/** biome-ignore-all lint/suspicious/noExplicitAny: - */

/* -------------------- Types -------------------- */

export type LogType = 'debug' | 'trace' | 'info' | 'success' | 'warn' | 'error';
export type LogLevel = LogType | 'time' | 'table' | 'off';
export type Variant = 'text' | 'symbol' | 'icon';

export type RemoteHandler = (type: LogType, data: RemoteLogData) => void;

export type RemoteOptions = { handler?: RemoteHandler; logLevel?: LogLevel };

export type RemoteLogData = {
  args: unknown[];
  environment: 'production' | 'development';
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
export type ResolvedRemote = { handler?: RemoteHandler; logLevel: LogLevel };
export type LogitConfig = Omit<Required<LogitOptions>, 'remote'> & { remote: ResolvedRemote };

export type Logger = {
  assert: (condition: boolean, ...args: unknown[]) => void;
  child: (overrides?: LogitOptions) => Logger;
  config: (opts: LogitOptions) => Logger;
  debug: (...args: unknown[]) => void;
  enabled: (type: LogLevel) => boolean;
  error: (...args: unknown[]) => void;
  getConfig: () => Readonly<LogitConfig>;
  group: (label?: string, text?: string) => void;
  groupCollapsed: (label?: string, text?: string) => void;
  groupEnd: () => void;
  info: (...args: unknown[]) => void;
  scope: (name: string) => Logger;
  success: (...args: unknown[]) => void;
  table: (data: unknown, properties?: string[]) => void;
  time: (label: string) => void;
  timeEnd: (label: string) => void;
  trace: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};

/* -------------------- Priority -------------------- */

// biome-ignore assist/source/useSortedKeys: intentional priority order
const PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  trace: 1,
  time: 2,
  table: 3,
  info: 4,
  success: 5,
  warn: 6,
  error: 7,
  off: 8,
};

/* -------------------- Theme -------------------- */

type Theme = { color: string; bg: string; border: string; icon?: string; symbol?: string };

const isDarkMode = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

// biome-ignore assist/source/useSortedKeys: grouped by concept
const THEME: Record<LogType | 'group' | 'ns', Theme> = {
  debug: { bg: '#616161', border: '#424242', color: '#fff', icon: '☕', symbol: '🅳' },
  trace: { bg: '#d81b60', border: '#c2185b', color: '#fff', icon: '⛢', symbol: '🆃' },
  info: { bg: '#1976d2', border: '#1565c0', color: '#fff', icon: 'ℹ', symbol: '🅸' },
  success: { bg: '#689f38', border: '#558b2f', color: '#fff', icon: '✔', symbol: '🆂' },
  warn: { bg: '#ffb300', border: '#ffa000', color: '#fff', icon: '⚠', symbol: '🆆' },
  error: { bg: '#d32f2f', border: '#c62828', color: '#fff', icon: '✘', symbol: '🅴' },
  group: { bg: '#546e7a', border: '#455a64', color: '#fff', icon: '⚭', symbol: '🅶' },
  ns: isDarkMode
    ? { bg: '#fafafa', border: '#c7c7c7', color: '#000' }
    : { bg: '#424242', border: '#212121', color: '#fff' },
};

const NS_STYLE = 'border-radius: 8px; font: italic small-caps bold 12px; font-weight: lighter; padding: 0 4px;';

/* -------------------- createLogger -------------------- */

const IS_NODE = typeof window === 'undefined';
const IS_PROD =
  (!IS_NODE && (import.meta as any)?.env?.NODE_ENV === 'production') ||
  // @ts-expect-error - process is Node-only
  (IS_NODE && (process as any).env?.NODE_ENV === 'production');

const ENV_BADGE = IS_PROD ? '🅿' : '🅳';

// biome-ignore assist/source/useSortedKeys: follows LogType union order
const LOG_METHOD: Record<LogType, 'log' | 'info' | 'warn' | 'error' | 'trace'> = {
  debug: 'log',
  trace: 'trace',
  info: 'info',
  success: 'log',
  warn: 'warn',
  error: 'error',
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
    remote: { logLevel: 'off', ...opts.remote }, // always merged last so the default logLevel survives
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
    const { bg, color, border } = THEME[type];
    const base = `border: 1px solid ${border}; border-radius: 4px`;
    switch (cfg.variant) {
      case 'symbol':
        return `color: ${bg}; ${base}; padding: 0 1px${extra}`;
      case 'icon':
        return `color: ${bg}; ${base}; padding: 0 3px${extra}`;
      default:
        return `background: ${bg}; color: ${color}; ${base}; font-weight: bold; padding: 0 3px${extra}`;
    }
  };

  const emitNode = (type: LogType, ns: string, stamp: string, args: unknown[]): void => {
    const meta = [badge(type)];
    if (cfg.environment) meta.push(ENV_BADGE);
    if (ns) meta.push(`[${ns}]`);
    if (stamp) meta.push(stamp);
    (console[LOG_METHOD[type]] as (...a: unknown[]) => void)(`${meta.join(' | ')} |`, ...args);
  };

  const emitBrowser = (type: LogType, ns: string, stamp: string, args: unknown[]): void => {
    let fmt = `%c${badge(type)}%c`;
    const parts: string[] = [style(type), ''];
    if (ns) { fmt += ` %c${ns}%c`; parts.push(style('ns', `; ${NS_STYLE}`), ''); }
    if (cfg.environment) { fmt += ` %c${ENV_BADGE}%c`; parts.push('color: darkgray', ''); }
    if (stamp) { fmt += ` %c${stamp}%c`; parts.push('color: gray', ''); }
    (console[LOG_METHOD[type]] as (...a: unknown[]) => void)(fmt, ...parts, ...args);
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
        environment: IS_PROD ? 'production' : 'development',
        namespace: ns || undefined,
        timestamp: stamp || undefined,
      };
      Promise.resolve().then(() => handler(type, data));
    }
  };

  const timeLabel = (label: string): string => (cfg.namespace ? `[${cfg.namespace}] ${label}` : label);

  /* ---- child factory ---- */
  // Creates an independent logger that inherits the current config as a snapshot.
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

  const renderGroupBrowser = (collapsed: boolean, label: string, text: string, ns: string, stamp: string): void => {
    const fn = collapsed ? console.groupCollapsed : console.group;
    let fmt = `%c${label}%c`;
    const parts: string[] = [style('group', '; margin-right: 6px; padding: 1px 3px 0'), ''];
    if (ns) { fmt += ` %c${ns}%c`; parts.push(style('ns', `; ${NS_STYLE}; margin-right: 6px`), ''); }
    if (cfg.environment) { fmt += ` %c${ENV_BADGE}%c`; parts.push('color: darkgray; margin-right: 6px', ''); }
    if (stamp) { fmt += ` %c${stamp}%c`; parts.push('color: gray; font-weight: lighter; margin-right: 6px', ''); }
    if (text) { fmt += ` %c${text}%c`; parts.push('color: inherit; font-weight: lighter', ''); }
    fn(fmt, ...parts);
  };

  const renderGroup = (collapsed: boolean, label: string, text: string): void => {
    const ns = cfg.namespace;
    const stamp = cfg.timestamp ? ts() : '';
    if (IS_NODE) renderGroupNode(collapsed, label, ns, stamp);
    else renderGroupBrowser(collapsed, label, text, ns, stamp);
  };

  /* ---- public API ---- */

  const logger: Logger = {
    config: (opts: LogitOptions): Logger => {
      const { remote, ...rest } = opts;
      if (remote !== undefined) Object.assign(cfg.remote, remote);
      Object.assign(cfg, rest);
      return logger;
    },

    getConfig: (): Readonly<LogitConfig> => ({
      ...cfg,
      remote: { ...cfg.remote },
    }),

    enabled: (type: LogLevel): boolean => passes(type),

    debug: (...a) => emit('debug', a),
    error: (...a) => emit('error', a),
    info: (...a) => emit('info', a),
    success: (...a) => emit('success', a),
    trace: (...a) => emit('trace', a),
    warn: (...a) => emit('warn', a),

    child: makeChild,

    scope: (name: string): Logger => makeChild({ namespace: cfg.namespace ? `${cfg.namespace}.${name}` : name }),

    table: (data: unknown, properties?: string[]): void => {
      if (passes('table')) console.table(data, properties);
    },

    time: (label: string): void => {
      if (passes('time')) console.time(timeLabel(label));
    },

    timeEnd: (label: string): void => {
      if (passes('time')) console.timeEnd(timeLabel(label));
    },

    group: (label = 'GROUP', text = ''): void => {
      if (passes('debug')) renderGroup(false, label, text);
    },

    groupCollapsed: (label = 'GROUP', text = ''): void => {
      if (passes('debug')) renderGroup(true, label, text);
    },

    groupEnd: (): void => {
      if (passes('debug')) console.groupEnd();
    },

    assert: (condition: boolean, ...args: unknown[]): void => {
      if (passes('error')) console.assert(condition, ...args);
    },
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

/** biome-ignore-all lint/suspicious/noExplicitAny: - */

/* -------------------- Core Types -------------------- */

export type LogLevel = 'debug' | 'trace' | 'time' | 'table' | 'info' | 'success' | 'warn' | 'error' | 'off';
export type LogType = Exclude<LogLevel, 'off'>;
type ColorType = Exclude<LogType, 'table'> | 'group' | 'ns';
export type Variant = 'text' | 'symbol' | 'icon';

export type RemoteOptions = {
  handler?: (type: LogType, data: RemoteLogData) => void;
  logLevel?: LogLevel;
};

export type RemoteLogData = {
  args: unknown[];
  environment: 'production' | 'development';
  namespace?: string;
  timestamp?: string;
};

export type LogitOptions = {
  environment?: boolean;
  variant?: Variant;
  logLevel?: LogLevel;
  namespace?: string;
  remote?: RemoteOptions;
  timestamp?: boolean;
};

export type ScopedLogger = {
  debug: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  scope: (name: string) => ScopedLogger;
  success: (...args: unknown[]) => void;
  trace: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};

/* -------------------- Constants -------------------- */

// biome-ignore assist/source/useSortedKeys: -
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
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

/* -------------------- Theme & Styles -------------------- */

type Theme = {
  color: string;
  bg: string;
  border: string;
  icon?: string;
  symbol?: string;
};

const isDarkMode = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

const THEME: Record<ColorType, Theme> = {
  debug: { bg: '#616161', border: '#424242', color: '#fff', icon: '☕', symbol: '🅳' },
  error: { bg: '#d32f2f', border: '#c62828', color: '#fff', icon: '✘', symbol: '🅴' },
  group: { bg: '#546e7a', border: '#455a64', color: '#fff', icon: '⚭', symbol: '🅶' },
  info: { bg: '#1976d2', border: '#1565c0', color: '#fff', icon: 'ℹ', symbol: '🅸' },
  ns: isDarkMode
    ? { bg: '#fafafa', border: '#c7c7c7', color: '#000' }
    : { bg: '#424242', border: '#212121', color: '#fff' },
  success: { bg: '#689f38', border: '#558b2f', color: '#fff', icon: '✔', symbol: '🆂' },
  time: { bg: '#0097a7', border: '#00838f', color: '#fff', icon: '⏲', symbol: '🆃' },
  trace: { bg: '#d81b60', border: '#c2185b', color: '#fff', icon: '⛢', symbol: '🆃' },
  warn: { bg: '#ffb300', border: '#ffa000', color: '#fff', icon: '⚠', symbol: '🆆' },
};

const NAMESPACE_STYLE = 'border-radius: 8px; font: italic small-caps bold 12px; font-weight: lighter; padding: 0 4px;';

/* -------------------- Environment Detection -------------------- */

const IS_PROD =
  (typeof window !== 'undefined' && (import.meta as any)?.env?.NODE_ENV === 'production') ||
  // @ts-expect-error - process.env is Node.js-only
  (typeof process !== 'undefined' && (process as any).env?.NODE_ENV === 'production');

const ENV_INDICATOR = IS_PROD ? '🅿' : '🅳';

/* -------------------- State -------------------- */

export type LogitConfig = Required<Omit<LogitOptions, 'remote'>> & { remote: RemoteOptions };

const state: LogitConfig = {
  environment: true,
  logLevel: 'debug',
  namespace: '',
  remote: { logLevel: 'off' },
  timestamp: true,
  variant: 'symbol',
};

/* -------------------- Helper Functions -------------------- */

function shouldLog(type: LogType): boolean {
  return LOG_LEVEL_PRIORITY[state.logLevel] <= LOG_LEVEL_PRIORITY[type];
}

function getTimestamp(): string {
  return new Date().toISOString().slice(11, 23);
}

function sendRemote(type: LogType, args: unknown[]): void {
  const { handler, logLevel = 'off' } = state.remote;

  if (handler && LOG_LEVEL_PRIORITY[logLevel] <= LOG_LEVEL_PRIORITY[type]) {
    // Use microtask to make async without setTimeout overhead
    Promise.resolve().then(() => {
      handler(type, {
        args,
        environment: IS_PROD ? 'production' : 'development',
        namespace: state.namespace || undefined,
        timestamp: state.timestamp ? getTimestamp() : undefined,
      });
    });
  }
}

function getStyle(type: ColorType, extra = ''): string {
  const { bg, color, border } = THEME[type];
  const baseStyle = `border: 1px solid ${border}; border-radius: 4px`;

  switch (state.variant) {
    case 'symbol':
      return `color: ${bg}; ${baseStyle}; padding: 0 1px${extra}`;
    case 'icon':
      return `color: ${bg}; ${baseStyle}; padding: 0 3px${extra}`;
    default:
      return `background: ${bg}; color: ${color}; ${baseStyle}; font-weight: bold; padding: 0 3px${extra}`;
  }
}

function getDisplayValue(type: LogType): string {
  const theme = THEME[type as ColorType];
  if (!theme || state.variant === 'text' || !theme[state.variant]) return type.toUpperCase();
  return theme[state.variant]!;
}

function buildLogParts(type: LogType, ns: string): { format: string; parts: string[] } {
  const { timestamp, environment } = state;

  let format = `%c${getDisplayValue(type)}%c`;
  const parts: string[] = [getStyle(type as ColorType), ''];

  if (ns) {
    format += ` %c${ns}%c`;
    parts.push(getStyle('ns', `; ${NAMESPACE_STYLE}`), '');
  }

  if (environment) {
    format += ` %c${ENV_INDICATOR}%c`;
    parts.push('color: darkgray', '');
  }

  if (timestamp) {
    format += ` %c${getTimestamp()}%c`;
    parts.push('color: gray', '');
  }

  return { format, parts };
}

function log(type: LogType, ns: string, ...args: unknown[]): void {
  if (!shouldLog(type)) return;

  const method = console[type === 'debug' || type === 'success' ? 'log' : type] as (...a: unknown[]) => void;

  if (typeof window === 'undefined') {
    method(`${getDisplayValue(type)} | ${ENV_INDICATOR} |`, ...args);
  } else {
    const { format, parts } = buildLogParts(type, ns);
    method(format, ...parts, ...args);
  }

  sendRemote(type, args);
}

function createScopedLogger(namespace: string): ScopedLogger {
  const createMethod =
    (type: LogType) =>
    (...args: unknown[]) =>
      log(type, namespace, ...args);

  return {
    debug: createMethod('debug'),
    error: createMethod('error'),
    info: createMethod('info'),
    scope: (name: string) => createScopedLogger(`${namespace}.${name}`),
    success: createMethod('success'),
    trace: createMethod('trace'),
    warn: createMethod('warn'),
  };
}

/* -------------------- Public API -------------------- */

export const Logit = {
  /**
   * Asserts a condition and logs if false.
   */
  assert: (condition: boolean, message: string, context?: Record<string, unknown>): void => {
    if (shouldLog('error')) console.assert(condition, message, context);
  },

  /**
   * Configures Logit with options.
   *
   * @example
   * ```ts
   * Logit.config({
   *   logLevel: 'info',
   *   variant: 'text',
   *   timestamp: false
   * });
   * ```
   */
  config: ({ remote, ...rest }: LogitOptions): void => {
    if (remote !== undefined) state.remote = remote;
    Object.assign(state, rest);
  },
  /**
   * Logs a debug message.
   */
  debug: (...args: unknown[]): void => log('debug', state.namespace, ...args),

  /**
   * Logs an error message.
   */
  error: (...args: unknown[]): void => log('error', state.namespace, ...args),

  /**
   * Returns a readonly snapshot of the current configuration.
   *
   * @example
   * ```ts
   * const { logLevel, namespace } = Logit.getConfig();
   * ```
   */
  getConfig: (): Readonly<LogitConfig> => ({ ...state, remote: { ...state.remote } }),

  /**
   * Creates a collapsed console group.
   */
  groupCollapsed: (label = 'GROUP', text = ''): void => {
    if (!shouldLog('success')) return;

    const timestamp = state.timestamp ? getTimestamp() : '';

    console.groupCollapsed(
      `%c${label}%c${state.namespace}%c${ENV_INDICATOR}%c${timestamp}%c${text}`,
      getStyle('group', '; margin-right: 6px; padding: 1px 3px 0'),
      getStyle('ns', `; ${NAMESPACE_STYLE}; margin-right: 6px`),
      'color: darkgray; margin-right: 6px',
      'color: gray; font-weight: lighter; margin-right: 6px',
      'color: inherit; font-weight: lighter',
    );
  },

  /**
   * Ends the current console group.
   */
  groupEnd: (): void => {
    if (shouldLog('debug')) console.groupEnd();
  },

  /**
   * Logs an info message.
   */
  info: (...args: unknown[]): void => log('info', state.namespace, ...args),

  /**
   * Creates a scoped logger with a namespace.
   * Scoped loggers can be nested via their own `.scope()` method.
   *
   * @example
   * ```ts
   * const apiLogger = Logit.scope('api');
   * const authLogger = apiLogger.scope('auth');
   * authLogger.info('Token validated'); // namespace: api.auth
   * ```
   */
  scope: (name: string): ScopedLogger => {
    const ns = state.namespace ? `${state.namespace}.${name}` : name;
    return createScopedLogger(ns);
  },

  /**
   * Logs a success message.
   */
  success: (...args: unknown[]): void => log('success', state.namespace, ...args),

  /**
   * Displays data in a table format.
   */
  table: (data: unknown, properties?: string[]): void => {
    if (shouldLog('table')) properties ? console.table(data, properties) : console.table(data);
  },

  /**
   * Starts a timer.
   */
  time: (label: string): void => {
    if (shouldLog('time')) console.time(label);
  },

  /**
   * Ends a timer.
   */
  timeEnd: (label: string): void => {
    if (shouldLog('time')) console.timeEnd(label);
  },

  /**
   * Toggles or explicitly sets environment indicator visibility.
   */
  toggleEnvironment: (value?: boolean): void => {
    state.environment = value ?? !state.environment;
  },

  /**
   * Toggles or explicitly sets timestamp visibility.
   */
  toggleTimestamp: (value?: boolean): void => {
    state.timestamp = value ?? !state.timestamp;
  },

  /**
   * Logs a trace message.
   */
  trace: (...args: unknown[]): void => log('trace', state.namespace, ...args),

  /**
   * Logs a warning message.
   */
  warn: (...args: unknown[]): void => log('warn', state.namespace, ...args),
};

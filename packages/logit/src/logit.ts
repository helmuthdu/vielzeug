/** biome-ignore-all lint/suspicious/noExplicitAny: - */

/* -------------------- Core Types -------------------- */

export type LogLevel = 'debug' | 'trace' | 'time' | 'table' | 'info' | 'success' | 'warn' | 'error' | 'off';
export type LogType = Exclude<LogLevel, 'off'>;
export type ColorType = Exclude<LogType, 'table'> | 'group' | 'ns';
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
  success: (...args: unknown[]) => void;
  trace: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};

/* -------------------- Constants -------------------- */

const ENV_PROD = '🅿';
const ENV_DEV = '🅳';

const CONSOLE_METHOD_MAP: Partial<Record<LogType, keyof Console>> = {
  debug: 'log',
  success: 'log',
};

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

/**
 * Detects if running in a production environment.
 * Checks both browser (import.meta.env) and Node.js (process.env).
 */
function isProduction(): boolean {
  // Browser environment (Vite, Webpack, etc.)
  if (typeof window !== 'undefined' && (import.meta as any)?.env?.NODE_ENV === 'production') {
    return true;
  }

  // @ts-expect-error - process.env exists in Node.js but not in a browser
  return typeof process !== 'undefined' && (process as any).env?.NODE_ENV === 'production';
}

const IS_PROD = isProduction();

/* -------------------- State -------------------- */

const state: Required<LogitOptions> & { remote: Required<RemoteOptions> } = {
  environment: true,
  logLevel: 'debug',
  namespace: '',
  remote: { handler: undefined as any, logLevel: 'off' },
  timestamp: true,
  variant: 'symbol',
};

/* -------------------- Helper Functions -------------------- */

/**
 * Checks if a log should be displayed based on the current log level.
 */
function shouldLog(type: LogType): boolean {
  return LOG_LEVEL_PRIORITY[state.logLevel] <= LOG_LEVEL_PRIORITY[type];
}

/**
 * Gets the current timestamp in HH:MM:SS.mmm format.
 */
function getTimestamp(): string {
  return new Date().toISOString().slice(11, 23);
}

/**
 * Gets environment indicator emoji.
 */
function getEnvIndicator(): string {
  return IS_PROD ? ENV_PROD : ENV_DEV;
}

/**
 * Sends log to remote handler if configured.
 */
function sendRemote(type: LogType, args: unknown[]): void {
  const { handler, logLevel } = state.remote;

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

/**
 * Gets the console method for a log type.
 */
function getConsoleMethod(type: LogType): keyof Console {
  return (CONSOLE_METHOD_MAP[type] || type) as keyof Console;
}

/**
 * Generates CSS style for a log type.
 */
function getStyle(type: ColorType, extra = ''): string {
  const { bg, color, border } = THEME[type];
  const baseStyle = `border: 1px solid ${border}; border-radius: 4px`;

  switch (state.variant) {
    case 'symbol':
    case 'icon':
      return `color: ${bg}; ${baseStyle}; padding: 0 3px${extra}`;
    default:
      return `background: ${bg}; color: ${color}; ${baseStyle}; font-weight: bold; padding: 0 3px${extra}`;
  }
}

/**
 * Gets display value for a log type based on variant.
 */
function getDisplayValue(type: LogType): string {
  // Table doesn't have a theme, return uppercase
  if (type === 'table') {
    return type.toUpperCase();
  }

  const theme = THEME[type as ColorType];
  const { variant } = state;

  if (variant === 'text' || !theme[variant]) {
    return type.toUpperCase();
  }

  return theme[variant]!;
}

/**
 * Builds browser console format string and style parts.
 */
function buildLogParts(type: LogType): { format: string; parts: string[] } {
  const { namespace, timestamp, environment } = state;

  let format = `%c${getDisplayValue(type)}%c`;
  // Table doesn't have styling, but this is only called for types that do
  const parts: string[] = [getStyle(type as ColorType), ''];

  if (namespace) {
    format += ` %c${namespace}%c`;
    parts.push(getStyle('ns', `; ${NAMESPACE_STYLE}`), '');
  }

  if (environment) {
    format += ` %c${getEnvIndicator()}%c`;
    parts.push('color: darkgray', '');
  }

  if (timestamp) {
    format += ` %c${getTimestamp()}%c`;
    parts.push('color: gray', '');
  }

  return { format, parts };
}

/**
 * Core logging function.
 */
function log(type: LogType, ...args: unknown[]): void {
  // Node.js logging (simplified)
  if (typeof window === 'undefined') {
    const method = console[getConsoleMethod(type)] as (...a: unknown[]) => void;
    method(`${getDisplayValue(type)} | ${getEnvIndicator()} |`, ...args);
    return;
  }

  // Check the log level
  if (!shouldLog(type)) return;

  // Browser logging with styles
  const { format, parts } = buildLogParts(type);
  const method = console[getConsoleMethod(type)] as (...a: unknown[]) => void;

  method(format, ...parts, ...args);
  sendRemote(type, args);
}

/**
 * Creates a scoped logger without mutating global state.
 */
function createScopedLogger(scopeName: string): ScopedLogger {
  const originalNamespace = state.namespace;
  const fullNamespace = originalNamespace ? `${originalNamespace}.${scopeName}` : scopeName;

  const createMethod = (type: LogType) => {
    return (...args: unknown[]) => {
      const prev = state.namespace;
      state.namespace = fullNamespace;
      log(type, ...args);
      state.namespace = prev;
    };
  };

  return {
    debug: createMethod('debug'),
    error: createMethod('error'),
    info: createMethod('info'),
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
    console.assert(condition, message, context);
  },
  /**
   * Logs a debug message.
   */
  debug: (...args: unknown[]): void => log('debug', ...args),

  /**
   * Logs an error message.
   */
  error: (...args: unknown[]): void => log('error', ...args),

  /**
   * Gets environment indicator visibility.
   */
  getEnvironment: (): boolean => state.environment,

  /**
   * Gets the current log level.
   */
  getLevel: (): LogLevel => state.logLevel,

  /**
   * Gets the current namespace.
   */
  getPrefix: (): string => state.namespace,

  /**
   * Gets timestamp visibility.
   */
  getTimestamp: (): boolean => state.timestamp,

  /**
   * Gets the current variant.
   */
  getVariant: (): Variant => state.variant,

  /**
   * Creates a collapsed console group.
   */
  groupCollapsed: (text: string, label = 'GROUP', startTime = Date.now()): void => {
    if (!shouldLog('success')) return;

    const elapsed = Date.now() - startTime;
    const elapsedStr = elapsed ? `${elapsed}ms` : '';
    const env = getEnvIndicator();
    const timestamp = state.timestamp ? getTimestamp() : '';

    console.groupCollapsed(
      `%c${label}%c${state.namespace}%c${env}%c${timestamp}%c${elapsedStr}%c${text}`,
      getStyle('group', '; margin-right: 6px; padding: 1px 3px 0'),
      getStyle('ns', `; ${NAMESPACE_STYLE}; margin-right: 6px`),
      'color: darkgray; margin-right: 6px',
      'color: gray; font-weight: lighter; margin-right: 6px',
      'color: gray; font-weight: lighter; margin-right: 6px',
      'color: inherit; font-weight: lighter',
    );
  },

  /**
   * Ends the current console group.
   */
  groupEnd: (): void => {
    if (shouldLog('success')) console.groupEnd();
  },

  /**
   * Logs an info message.
   */
  info: (...args: unknown[]): void => log('info', ...args),

  /**
   * Creates a scoped logger with a namespace.
   *
   * @example
   * ```ts
   * const apiLogger = Logit.scope('api');
   * apiLogger.info('Request received'); // [api] Request received
   * ```
   */
  scope: (namespace: string): ScopedLogger => createScopedLogger(namespace),

  /**
   * Sets the minimum log level.
   */
  setLogLevel: (level: LogLevel): void => {
    state.logLevel = level;
  },

  /**
   * Sets the global namespace prefix.
   */
  setPrefix: (namespace: string): void => {
    state.namespace = namespace;
  },

  /**
   * Sets the remote logging options.
   */
  setRemote: (remote: RemoteOptions): void => {
    state.remote = { ...state.remote, ...remote };
  },

  /**
   * Sets the remote log level.
   */
  setRemoteLogLevel: (level: LogLevel): void => {
    state.remote.logLevel = level;
  },

  /**
   * Configures Logit with options.
   *
   * @example
   * ```ts
   * Logit.setup({
   *   logLevel: 'info',
   *   variant: 'text',
   *   timestamp: false
   * });
   * ```
   */
  setup: (options: LogitOptions): void => {
    if (options.remote) {
      state.remote = { ...state.remote, ...options.remote };
      const { remote, ...rest } = options;
      Object.assign(state, rest);
    } else {
      Object.assign(state, options);
    }
  },

  /**
   * Sets the display variant.
   */
  setVariant: (variant: Variant): void => {
    state.variant = variant;
  },

  /**
   * Logs a success message.
   */
  success: (...args: unknown[]): void => log('success', ...args),

  /**
   * Displays data in a table format.
   */
  table: (...args: unknown[]): void => {
    if (shouldLog('table')) console.table(...args);
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
   * Toggles or sets environment indicator visibility.
   */
  toggleEnvironment: (value?: boolean): void => {
    state.environment = value ?? !state.environment;
  },

  /**
   * Toggles or sets timestamp visibility.
   */
  toggleTimestamp: (value?: boolean): void => {
    state.timestamp = value ?? !state.timestamp;
  },

  /**
   * Logs a trace message.
   */
  trace: (...args: unknown[]): void => log('trace', ...args),

  /**
   * Logs a warning message.
   */
  warn: (...args: unknown[]): void => log('warn', ...args),
};

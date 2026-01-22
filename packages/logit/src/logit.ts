/** biome-ignore-all lint/suspicious/noAssignInExpressions: - */
/** biome-ignore-all lint/suspicious/noExplicitAny: - */
declare global {
  interface Window {
    Logit: LogitInstance;
  }
}

/**
 * Environment indicator symbols.
 */
const ENV_PROD = '\uD83C\uDD3F'; // 🅿
const ENV_DEV = '\uD83C\uDD33'; // 🅳

/**
 * Console method mappings for log types.
 */
const CONSOLE_METHOD_MAP: Record<string, keyof Console> = {
  debug: 'log',
  success: 'log',
} as const;

/**
 * Checks if the current environment is production.
 */
const isProd = (): boolean => (import.meta as any)?.env?.NODE_ENV === 'production';

export type LogitInstance = typeof Logit;
export type LogitType = 'debug' | 'trace' | 'time' | 'table' | 'info' | 'success' | 'warn' | 'error';
export type LogitColors = Exclude<LogitType, 'table'> | 'group' | 'ns';
export type LogitLevel = LogitType | 'off';
export type LogitRemoteOptions = {
  handler?: (...args: any[]) => void;
  logLevel: LogitLevel;
};
export type LogitOptions = {
  environment?: boolean;
  variant?: 'text' | 'symbol' | 'icon';
  logLevel?: LogitLevel;
  namespace?: string;
  remote?: LogitRemoteOptions;
  timestamp?: boolean;
};
export type LogitTheme = { color: string; bg: string; border: string; icon?: string; symbol?: string };

const isDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
const Theme: Readonly<Record<LogitColors, LogitTheme>> = {
  debug: { bg: '#616161', border: '#424242', color: '#fff', icon: '\u2615', symbol: '\uD83C\uDD73' },
  error: { bg: '#d32f2f', border: '#c62828', color: '#fff', icon: '\u2718', symbol: '\uD83C\uDD74' },
  group: { bg: '#546e7a', border: '#455a64', color: '#fff', icon: '\u26AD', symbol: '\uD83C\uDD76' },
  info: { bg: '#1976d2', border: '#1565c0', color: '#fff', icon: '\u2139', symbol: '\uD83C\uDD78' },
  ns: isDark
    ? { bg: '#fafafa', border: '#c7c7c7', color: '#000' }
    : { bg: '#424242', border: '#212121', color: '#fff' },
  success: { bg: '#689f38', border: '#558b2f', color: '#fff', icon: '\u2714', symbol: '\uD83C\uDD82' },
  time: { bg: '#0097a7', border: '#00838f', color: '#fff', icon: '\u23F2', symbol: '\uD83C\uDD83' },
  trace: { bg: '#d81b60', border: '#c2185b', color: '#fff', icon: '\u26e2', symbol: '\uD83C\uDD83' },
  warn: { bg: '#ffb300', border: '#ffa000', color: '#fff', icon: '\u26a0', symbol: '\uD83C\uDD86' },
};

// biome-ignore assist/source/useSortedKeys: -
const logLevel: Readonly<Record<LogitLevel, number>> = {
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

const state: Required<LogitOptions> = {
  environment: true,
  logLevel: 'debug',
  namespace: '',
  remote: { handler: undefined, logLevel: 'off' },
  timestamp: true,
  variant: 'symbol',
};

/**
 * Determines if a log message should be shown based on the current log level.
 */
const shouldLog = (type: LogitType): boolean => logLevel[state.logLevel] <= logLevel[type];

/**
 * Gets the current timestamp in ISO format (HH:MM:SS.mmm).
 */
const getTimestamp = (): string => new Date().toISOString().slice(11, 23);

/**
 * Gets the environment indicator symbol.
 */
const getEnvIndicator = (): string => (isProd() ? ENV_PROD : ENV_DEV);

/**
 * Sends log data to remote handler if configured.
 */
const sendRemoteLog = (type: LogitType, args: any[]): void => {
  if (state.remote.handler && logLevel[state.remote.logLevel] <= logLevel[type]) {
    state.remote.handler(type, ...args);
  }
};

/**
 * Gets the console method for a given log type.
 */
const getConsoleMethod = (type: LogitType): keyof Console => {
  return (CONSOLE_METHOD_MAP[type] || type) as keyof Console;
};

/**
 * Generates CSS styles for log messages based on theme and variant.
 */
const style = (type: LogitColors, extra = ''): string => {
  const { bg, color, border } = Theme[type];
  const baseStyle = `color: ${bg}; border: 1px solid ${border}; border-radius: 4px;`;

  switch (state.variant) {
    case 'symbol':
      return `${baseStyle} padding: 1px 1px 0;${extra};`;
    case 'icon':
      return `${baseStyle} padding: 0 3px;${extra};`;
    default:
      return `background: ${bg}; color: ${color}; border: 1px solid ${border}; border-radius: 4px; font-weight: bold; padding: 0 3px;${extra}`;
  }
};

/**
 * Builds the format string and style parts for browser console logging.
 */
function buildBrowserLogParts(type: LogitType): { format: string; parts: string[] } {
  const theme = Theme[type as LogitColors];
  const { namespace, variant, timestamp, environment } = state;

  let format = `%c${theme[variant as keyof LogitTheme] ?? type.toUpperCase()}%c`;
  const parts: string[] = [style(type as any), ''];

  if (namespace) {
    format += ` %c${namespace}%c`;
    parts.push(style('ns', ' border-radius: 8px; font: italic small-caps bold 12px; font-weight: lighter;'), '');
  }

  if (environment) {
    format += ` %c${getEnvIndicator()}%c`;
    parts.push('color: darkgray;', '');
  }

  if (timestamp) {
    format += ` %c${getTimestamp()}%c`;
    parts.push('color: gray;', '');
  }

  return { format, parts };
}

/**
 * Logs messages to the console with styling and metadata.
 */
const log = (type: LogitType, ...args: any[]): void => {
  // Server-side logging (Node.js)
  if (typeof window === 'undefined') {
    const theme = Theme[type as LogitColors];
    const { variant } = state;
    const consoleMethod = console[getConsoleMethod(type)] as (...a: any) => void;
    consoleMethod(`${theme[variant as keyof LogitTheme] ?? type.toUpperCase()} | ${getEnvIndicator()} |`, ...args);
    return;
  }

  // Check log level
  if (!shouldLog(type)) return;

  // Browser-side logging with styling
  const { format, parts } = buildBrowserLogParts(type);
  const consoleMethod = console[getConsoleMethod(type)] as (...a: any) => void;

  consoleMethod(format, ...parts, ...args);
  sendRemoteLog(type, args);
};

/**
 * Formats the elapsed time for display.
 */
const formatElapsedTime = (startTime: number): string => {
  const elapsed = Math.floor(Date.now() - startTime);
  return elapsed ? `${elapsed}ms` : '';
};

export const Logit = {
  /**
   * Asserts a condition and logs an error if it's false.
   */
  assert: (valid: boolean, message: string, context: Record<string, any>): void =>
    console.assert(valid, message, context),

  debug: (...args: any[]): void => log('debug', ...args),
  error: (...args: any[]): void => log('error', ...args),

  /**
   * Gets the current log level.
   */
  getLevel: (): LogitLevel => state.logLevel,

  /**
   * Gets the current namespace prefix.
   */
  getPrefix: (): string => state.namespace,

  /**
   * Gets whether timestamps are shown.
   */
  getTimestamp: (): boolean => state.timestamp,

  /**
   * Creates a collapsed group in the console.
   */
  groupCollapsed: (text: string, label = 'GROUP', time = Date.now()): void => {
    if (!shouldLog('success')) return;

    const elapsed = formatElapsedTime(time);
    const env = getEnvIndicator();

    console.groupCollapsed(
      `%c${label}%c${state.namespace}%c${env}%c${state.timestamp ? getTimestamp() : ''}%c${elapsed}%c${text}`,
      style('group', 'margin-right: 6px; padding: 1px 3px 0'),
      style('ns', ' border-radius: 8px; font: italic small-caps bold 12px; font-weight: lighter;margin-right: 6px;'),
      'color: darkgray; margin-right: 6px;',
      'color: gray;font-weight: lighter;margin-right: 6px;',
      'color: gray; font-weight: lighter;margin-right: 6px;',
      'color: inherit;font-weight: lighter;',
    );
  },

  /**
   * Ends the current console group.
   */
  groupEnd: (): void => {
    if (shouldLog('success')) console.groupEnd();
  },

  info: (...args: any[]): void => log('info', ...args),

  /**
   * Initializes Logit with custom options.
   */
  initialise: (options: LogitOptions): void => {
    Object.assign(state, options);
  },

  /**
   * Sets the minimum log level to display.
   */
  setLogLevel: (level: LogitLevel): void => {
    state.logLevel = level;
  },

  /**
   * Sets the namespace prefix for all logs.
   */
  setPrefix: (namespace: string): void => {
    state.namespace = namespace;
  },

  /**
   * Configures remote logging options.
   */
  setRemote: (remote: LogitRemoteOptions): void => {
    state.remote = remote;
  },

  /**
   * Sets the log level for remote logging.
   */
  setRemoteLogLevel: (level: LogitLevel): void => {
    state.remote.logLevel = level;
  },

  /**
   * Sets the display variant (text, icon, or symbol).
   */
  setVariant: (variant: 'text' | 'icon' | 'symbol'): void => {
    state.variant = variant;
  },

  /**
   * Shows or hides the environment indicator.
   */
  showEnvironment: (value: boolean): void => {
    state.environment = value;
  },

  /**
   * Shows or hides timestamps in logs.
   */
  showTimestamp: (value: boolean): void => {
    state.timestamp = value;
  },

  success: (...args: any[]): void => log('success', ...args),

  /**
   * Displays data in a table format.
   */
  table: (...args: any[]): void => {
    if (shouldLog('table')) console.table(...args);
  },

  /**
   * Starts a timer with the given label.
   */
  time: (label: string): void => {
    if (shouldLog('time')) console.time(label);
  },

  /**
   * Ends a timer with the given label.
   */
  timeEnd: (label: string): void => {
    if (shouldLog('time')) console.timeEnd(label);
  },

  trace: (...args: any[]): void => log('trace', ...args),
  warn: (...args: any[]): void => log('warn', ...args),
};

if (typeof window !== 'undefined') {
  window.Logit = Logit;
}

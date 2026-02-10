/** biome-ignore-all lint/suspicious/noAssignInExpressions: - */
/** biome-ignore-all lint/suspicious/noExplicitAny: - */

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
 * Cached for performance - evaluated once at a module load.
 *
 * Note: import.meta.env is available in Vite/Bundlers but may be undefined in some environments.
 * Using 'any' cast is necessary for cross-environment compatibility.
 */
const isProduction = (): boolean => {
  // Browser environment (Vite, Webpack, etc.)
  // import.meta.env may be undefined in some bundlers - safe check with optional chaining
  if (typeof window !== 'undefined' && (import.meta as any)?.env?.NODE_ENV) {
    return (import.meta as any).env.NODE_ENV === 'production';
  }

  // Node.js environment
  // @ts-expect-error - process.env exists in Node.js but not in browser
  if (typeof process !== 'undefined' && (process as any).env?.NODE_ENV) {
    // @ts-expect-error - process.env exists in Node.js
    return (process as any).env.NODE_ENV === 'production';
  }

  return false;
};

// Cache the result to avoid repeated checks
const IS_PROD = isProduction();

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

/**
 * Scoped logger interface with namespaced logging methods.
 */
export type ScopedLogger = {
  debug: (...args: any[]) => void;
  error: (...args: any[]) => void;
  info: (...args: any[]) => void;
  success: (...args: any[]) => void;
  trace: (...args: any[]) => void;
  warn: (...args: any[]) => void;
};

/**
 * Detects dark mode preference at module load time.
 * Note: This is intentionally static and won't update if the user changes their theme.
 */
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
const getCurrentTimestamp = (): string => new Date().toISOString().slice(11, 23);

/**
 * Gets the environment indicator symbol.
 */
const getEnvIndicator = (): string => (IS_PROD ? ENV_PROD : ENV_DEV);

/**
 * Sends log data to a remote handler if configured.
 */
const sendRemoteLog = (type: LogitType, args: any[]): void => {
  if (state.remote.handler && logLevel[state.remote.logLevel] <= logLevel[type]) {
    Promise.resolve().then(() => {
      state.remote.handler?.(type, {
        args,
        environment: IS_PROD ? 'production' : 'development',
        namespace: state.namespace || undefined,
        timestamp: state.timestamp ? getCurrentTimestamp() : undefined,
      });
    });
  }
};

/**
 * Gets the console method for a given log type.
 */
const getConsoleMethod = (type: LogitType): keyof Console => {
  return (CONSOLE_METHOD_MAP[type] || type) as keyof Console;
};

/**
 * CSS style constants for consistent formatting.
 */
const BASE_BORDER_STYLE = 'border: 1px solid';
const BASE_BORDER_RADIUS = 'border-radius: 4px';
const NAMESPACE_STYLE = 'border-radius: 8px; font: italic small-caps bold 12px; font-weight: lighter; padding: 0 4px;';

/**
 * Generates CSS styles for log messages based on theme and variant.
 *
 * @param type - Log type color scheme
 * @param extra - Additional CSS to append (should include leading semicolon if needed)
 */
const style = (type: LogitColors, extra = ''): string => {
  const { bg, color, border } = Theme[type];
  const baseStyle = `${BASE_BORDER_STYLE} ${border}; ${BASE_BORDER_RADIUS}`;

  switch (state.variant) {
    case 'symbol':
      // Symbol variant: colored text on a transparent background
      return `color: ${bg}; ${baseStyle}; padding: 1px 1px 0${extra}`;
    case 'icon':
      // Icon variant: colored text on a transparent background
      return `color: ${bg}; ${baseStyle}; padding: 0 3px${extra}`;
    default:
      // Text variant: white text on a colored background
      return `background: ${bg}; color: ${color}; ${baseStyle}; font-weight: bold; padding: 0 3px${extra}`;
  }
};

/**
 * Gets the display value for a log type based on the current variant.
 */
const getDisplayValue = (type: LogitType): string => {
  const theme = Theme[type as LogitColors];
  const { variant } = state;

  // For 'text' variant or if the variant property doesn't exist in theme, use uppercase type
  if (variant === 'text' || !theme || !theme[variant]) {
    return type.toUpperCase();
  }

  return theme[variant] as string;
};

/**
 * Builds the format string and style parts for browser console logging.
 */
function buildBrowserLogParts(type: LogitType): { format: string; parts: string[] } {
  const { namespace, timestamp, environment } = state;

  let format = `%c${getDisplayValue(type)}%c`;
  const parts: string[] = [style(type as LogitColors), ''];

  if (namespace) {
    format += ` %c${namespace}%c`;
    parts.push(style('ns', `; ${NAMESPACE_STYLE}`), '');
  }

  if (environment) {
    format += ` %c${getEnvIndicator()}%c`;
    parts.push('color: darkgray', '');
  }

  if (timestamp) {
    format += ` %c${getCurrentTimestamp()}%c`;
    parts.push('color: gray', '');
  }

  return { format, parts };
}

/**
 * Logs messages to the console with styling and metadata.
 */
const log = (type: LogitType, ...args: any[]): void => {
  // Server-side logging (Node.js)
  if (typeof window === 'undefined') {
    const consoleMethod = console[getConsoleMethod(type)] as (...a: any[]) => void;
    consoleMethod(`${getDisplayValue(type)} | ${getEnvIndicator()} |`, ...args);
    return;
  }

  // Check the log level
  if (!shouldLog(type)) return;

  // Browser-side logging with styling
  const { format, parts } = buildBrowserLogParts(type);
  const consoleMethod = console[getConsoleMethod(type)] as (...a: any[]) => void;

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
   * Gets whether the environment indicator is shown.
   */
  getEnvironment: (): boolean => state.environment,

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
   * Gets the current display variant.
   */
  getVariant: (): 'text' | 'symbol' | 'icon' => state.variant,

  /**
   * Creates a collapsed group in the console.
   */
  groupCollapsed: (text: string, label = 'GROUP', time = Date.now()): void => {
    if (!shouldLog('success')) return;

    const elapsed = formatElapsedTime(time);
    const env = getEnvIndicator();
    const timestamp = state.timestamp ? getCurrentTimestamp() : '';

    console.groupCollapsed(
      `%c${label}%c${state.namespace}%c${env}%c${timestamp}%c${elapsed}%c${text}`,
      style('group', '; margin-right: 6px; padding: 1px 3px 0'),
      style('ns', `; ${NAMESPACE_STYLE}; margin-right: 6px`),
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

  info: (...args: any[]): void => log('info', ...args),

  /**
   * Creates a scoped logger with a namespaced prefix.
   * Does not mutate global state - returns an isolated logger instance.
   *
   * @param namespace - The namespace to prepend to all log messages
   * @returns A scoped logger with all logging methods
   *
   * @example
   * ```ts
   * const apiLogger = Logit.scope('api');
   * apiLogger.info('Request received'); // [API] Request received
   *
   * const dbLogger = Logit.scope('database');
   * dbLogger.error('Connection failed'); // [DATABASE] Connection failed
   * ```
   */
  scope: (namespace: string): ScopedLogger => {
    const originalNamespace = state.namespace;
    const scopedNamespace = originalNamespace ? `${originalNamespace}.${namespace}` : namespace;

    return {
      debug: (...args: any[]) => {
        const prev = state.namespace;
        state.namespace = scopedNamespace;
        log('debug', ...args);
        state.namespace = prev;
      },
      error: (...args: any[]) => {
        const prev = state.namespace;
        state.namespace = scopedNamespace;
        log('error', ...args);
        state.namespace = prev;
      },
      info: (...args: any[]) => {
        const prev = state.namespace;
        state.namespace = scopedNamespace;
        log('info', ...args);
        state.namespace = prev;
      },
      success: (...args: any[]) => {
        const prev = state.namespace;
        state.namespace = scopedNamespace;
        log('success', ...args);
        state.namespace = prev;
      },
      trace: (...args: any[]) => {
        const prev = state.namespace;
        state.namespace = scopedNamespace;
        log('trace', ...args);
        state.namespace = prev;
      },
      warn: (...args: any[]) => {
        const prev = state.namespace;
        state.namespace = scopedNamespace;
        log('warn', ...args);
        state.namespace = prev;
      },
    };
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
   * Configures Logit with custom options.
   *
   * Note: The remote option will be merged with existing remote config,
   * not replaced entirely. To clear a remote handler, set remote.handler to undefined.
   */
  setup: (options: LogitOptions): void => {
    if (options.remote) {
      state.remote = { ...state.remote, ...options.remote };
      delete (options as any).remote; // Remove to avoid Object.assign overwrite
    }
    Object.assign(state, options);
  },

  /**
   * Sets the display variant (text, icon, or symbol).
   */
  setVariant: (variant: 'text' | 'icon' | 'symbol'): void => {
    state.variant = variant;
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

  /**
   * Toggles or sets the environment indicator visibility.
   * When called without arguments, toggles the current state.
   *
   * @param value - Optional boolean to explicitly set the state
   *
   * @example
   * ```ts
   * Logit.toggleEnvironment();      // Toggles current state
   * Logit.toggleEnvironment(true);  // Shows environment indicator
   * Logit.toggleEnvironment(false); // Hides environment indicator
   * ```
   */
  toggleEnvironment: (value?: boolean): void => {
    state.environment = value ?? !state.environment;
  },

  /**
   * Toggles or sets timestamp visibility in logs.
   * When called without arguments, toggles the current state.
   *
   * @param value - Optional boolean to explicitly set the state
   *
   * @example
   * ```ts
   * Logit.toggleTimestamp();      // Toggles current state
   * Logit.toggleTimestamp(true);  // Shows timestamps
   * Logit.toggleTimestamp(false); // Hides timestamps
   * ```
   */
  toggleTimestamp: (value?: boolean): void => {
    state.timestamp = value ?? !state.timestamp;
  },

  trace: (...args: any[]): void => log('trace', ...args),
  warn: (...args: any[]): void => log('warn', ...args),
};

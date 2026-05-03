export const logitTypes = `
declare module '@vielzeug/logit' {
  export type LogType = 'debug' | 'trace' | 'info' | 'success' | 'warn' | 'error';
  export type LogLevel = LogType | 'off';
  export type Variant = 'text' | 'symbol' | 'icon';

  export type LogitOptions = {
    environment?: boolean;
    logLevel?: LogLevel;
    namespace?: string;
    timestamp?: boolean;
    variant?: Variant;
    remote?: {
      logLevel?: LogLevel;
      handler?: (type: LogType, data: { args: unknown[]; env: 'production' | 'development'; namespace?: string; timestamp?: string }) => void;
    };
  };

  export type Logger = {
    readonly config: Readonly<{
      environment: boolean;
      logLevel: LogLevel;
      namespace: string;
      timestamp: boolean;
      variant: Variant;
      remote: { logLevel: LogLevel; handler?: (type: LogType, data: { args: unknown[]; env: 'production' | 'development'; namespace?: string; timestamp?: string }) => void };
    }>;
    setConfig(opts: LogitOptions): Logger;
    child(overrides?: LogitOptions): Logger;
    scope(name: string): Logger;
    enabled(type: LogLevel): boolean;
    assert(condition: boolean, ...args: unknown[]): void;
    debug(...args: unknown[]): void;
    trace(...args: unknown[]): void;
    info(...args: unknown[]): void;
    success(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
    table(data: unknown, properties?: string[]): void;
    group<T>(label: string, fn: () => T): T;
    groupCollapsed<T>(label: string, fn: () => T): T;
    time<T>(label: string, fn: () => T): T;
  };

  export function createLogger(initial?: LogitOptions | string): Logger;
  export const Logit: Logger;
}
`;

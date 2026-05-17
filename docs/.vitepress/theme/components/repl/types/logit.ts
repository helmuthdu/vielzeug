export const logitTypes = `
declare module '@vielzeug/logit' {
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
    timestamp?: boolean;
    variant?: Variant;
    remote?: RemoteOptions | null;
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

  export type Logger = {
    readonly bindings: Readonly<Bindings>;
    child(overrides?: LogitOptions): Logger;
    readonly config: Readonly<LogitConfig>;
    scope(name: string): Logger;
    enabled(type: LogLevel): boolean;
    debug(msgOrCtx?: string | Bindings | Error, msg?: string): void;
    info(msgOrCtx?: string | Bindings | Error, msg?: string): void;
    warn(msgOrCtx?: string | Bindings | Error, msg?: string): void;
    error(msgOrCtx?: string | Bindings | Error, msg?: string): void;
    fatal(msgOrCtx?: string | Bindings | Error, msg?: string): void;
    group<T>(label: string, fn: () => T): T;
    groupCollapsed<T>(label: string, fn: () => T): T;
    time<T>(label: string, fn: () => T): T;
    withBindings(bindings: Bindings): Logger;
  };

  export function createLogger(initial?: LogitOptions | string, initialBindings?: Bindings): Logger;
  export const Logit: Logger;
}
`;

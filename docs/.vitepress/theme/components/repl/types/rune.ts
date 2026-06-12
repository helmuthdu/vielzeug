export const runeTypes = `
declare module '/rune' {
  export type LogType = 'debug' | 'error' | 'fatal' | 'info' | 'warn';
  export type LogLevel = LogType | 'off';
  export type Variant = 'icon' | 'symbol' | 'text';
  export type Bindings = Record<string, unknown>;

  export type SerializedError = {
    message: string;
    name: string;
    stack?: string;
  };

  export type LogEntry = {
    bindings: Readonly<Bindings>;
    context?: Bindings;
    level: LogType;
    message?: string;
    namespace: string;
    timestamp: Date;
  };

  export type Transport = (entry: LogEntry) => void;

  export type BatchTransport = Transport & {
    flush: () => void;
    dispose: () => void;
  };

  export type RemoteLogData = {
    context?: Bindings;
    env: 'development' | 'production';
    level: LogType;
    message?: string;
    namespace?: string;
    timestamp: string;
  };

  export type RemoteHandler = (type: LogType, data: RemoteLogData) => void;

  export type ConsoleTransportOptions = {
    level?: LogLevel;
    timestamp?: boolean;
    variant?: Variant;
  };

  export type RemoteTransportOptions = {
    env?: 'development' | 'production';
    level?: LogLevel;
  };

  export type JsonTransportOptions = {
    level?: LogLevel;
    output?: (line: string) => void;
  };

  export type BatchTransportOptions = {
    interval?: number;
    level?: LogLevel;
    maxSize?: number;
    onFlush: (entries: LogEntry[]) => void;
  };

  export type SampleTransportOptions = {
    rate: number;
    transport: Transport;
  };

  export type RedactTransportOptions = {
    keys: string[];
    replacement?: string;
    transport: Transport;
  };

  export type RuneOptions = {
    env?: 'development' | 'production';
    logLevel?: LogLevel;
    namespace?: string;
    transports?: Transport[];
  };

  export type RuneConfig = {
    env: 'development' | 'production';
    logLevel: LogLevel;
    namespace: string;
    transports: Transport[];
  };

  export type LogMethod = {
    (message: string): void;
    (context: Bindings, message?: string): void;
    (error: Error, message?: string): void;
  };

  export type LazyBinding = { readonly fn: () => unknown };

  export type Logger = {
    readonly bindings: Readonly<Bindings>;
    readonly config: Readonly<RuneConfig>;
    child(overrides?: RuneOptions): Logger;
    debug: LogMethod;
    enabled(type: LogLevel): boolean;
    error: LogMethod;
    fatal: LogMethod;
    group<T>(label: string, fn: () => T): T;
    groupCollapsed<T>(label: string, fn: () => T): T;
    info: LogMethod;
    scope(name: string): Logger;
    time<T>(label: string, fn: () => T): T;
    warn: LogMethod;
    withBindings(bindings: Bindings): Logger;
  };

  export function lazy(fn: () => unknown): LazyBinding;
  export function isLazyBinding(value: unknown): value is LazyBinding;
  export function createLogger(initial?: RuneOptions | string, initialBindings?: Bindings): Logger;
  export const Rune: Logger;
  export function consoleTransport(options?: ConsoleTransportOptions): Transport;
  export function remoteTransport(handler: RemoteHandler, options?: RemoteTransportOptions): Transport;
  export function jsonTransport(options?: JsonTransportOptions): Transport;
  export function batchTransport(options: BatchTransportOptions): BatchTransport;
  export function sampleTransport(options: SampleTransportOptions): Transport;
  export function redactTransport(options: RedactTransportOptions): Transport;
}
`;

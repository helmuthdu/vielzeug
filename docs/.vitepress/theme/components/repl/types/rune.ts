export const runeTypes = `
declare module '/rune' {
  export type LogType = 'debug' | 'error' | 'fatal' | 'info' | 'warn';
  export type LogLevel = LogType | 'off';
  export type Bindings = Record<string, unknown>;

  export type SerializedError = {
    message: string;
    name: string;
    stack?: string;
  };

  export type LogEntry = {
    data: Readonly<Bindings>;
    level: LogType;
    message?: string;
    namespace: string;
    timestamp: Date;
  };

  export type Transport = (entry: LogEntry) => void;

  export type BatchHandle = {
    [Symbol.dispose]: () => void;
    dispose: () => void;
    flush: () => void;
    transport: Transport;
  };

  export type RemoteLogData = {
    data?: Bindings;
    env: 'development' | 'production';
    level: LogType;
    message?: string;
    namespace?: string;
    timestamp: string;
  };

  export type RemoteHandler = (type: LogType, data: RemoteLogData) => void;

  export type ConsoleTransportOptions = {
    ansi?: boolean;
    format?: 'json' | 'raw';
    inspectFn?: (v: unknown) => string;
    level?: LogLevel;
    timestamp?: boolean;
    theme?: ConsoleTheme;
  };

  export type RemoteTransportOptions = {
    env?: 'development' | 'production';
    handler: RemoteHandler;
    level?: LogLevel;
    onError?: (err: unknown, payload: RemoteLogData) => void;
  };

  export type JsonTransportOptions = {
    fields?: { level?: string; msg?: string; ns?: string; time?: string };
    level?: LogLevel;
    output?: (line: string) => void;
    safe?: boolean;
  };

  export type BatchTransportOptions = {
    interval?: number;
    level?: LogLevel;
    maxBuffer?: number;
    maxSize?: number;
    onFlush: (entries: LogEntry[]) => void;
    onFlushError?: (entries: LogEntry[], err: unknown) => void;
  };

  export type SampleTransportOptions = {
    level?: LogLevel;
    rate: number;
    transport: Transport;
  };

  export type RedactTransportOptions = {
    keys: string[];
    maxDepth?: number;
    replacement?: string;
    transport: Transport;
  };

  export type PipeOptions = {
    onError?: (err: unknown, entry: LogEntry) => void;
  };

  export type ConsoleThemeEntry = {
    badge: string;
    bg: string;
    border: string;
    color: string;
  };

  export type ConsoleTheme = Partial<Record<LogType | 'group' | 'ns', Partial<ConsoleThemeEntry>>>;
  export type ResolvedTheme = Record<LogType | 'group' | 'ns', ConsoleThemeEntry>;

  export type RuneOptions = {
    bindings?: Bindings;
    logLevel?: LogLevel;
    middleware?: LogMiddleware[];
    namespace?: string;
    transports?: Transport[];
  };

  export type LogMiddleware = (entry: LogEntry) => LogEntry | null;

  export type LogMethod = {
    (message: string): void;
    (error: Error, context?: Bindings, message?: string): void;
    (context: Bindings, message?: string): void;
  };

  export type LazyBinding = { readonly factory: () => unknown };

  export type Logger = {
    [Symbol.dispose]: () => void;
    readonly bindings: Readonly<Bindings>;
    child(overrides?: RuneOptions): Logger;
    debug: LogMethod;
    readonly disposalSignal: AbortSignal;
    dispose: () => void;
    readonly disposed: boolean;
    enabled(type: LogLevel): boolean;
    error: LogMethod;
    fatal: LogMethod;
    group<T>(label: string, fn: () => T, level?: LogType): T;
    groupCollapsed<T>(label: string, fn: () => T, level?: LogType): T;
    info: LogMethod;
    readonly logLevel: LogLevel;
    readonly middleware: readonly LogMiddleware[];
    readonly namespace: string;
    time<T>(label: string, fn: () => T, level?: LogType): T;
    readonly transports: readonly Transport[];
    use(middleware: LogMiddleware): Logger;
    warn: LogMethod;
    withBindings(bindings: Bindings): Logger;
  };

  export function lazy(fn: () => unknown): LazyBinding;
  export function isLevelEnabled(threshold: LogLevel, level: LogType): boolean;
  export function createLogger(namespace: string, options?: Omit<RuneOptions, 'namespace'>): Logger;
  export function createLogger(options?: RuneOptions): Logger;
  export const Rune: Logger;
  export const DEFAULT_THEME: ResolvedTheme;
  export function resolveTheme(override: ConsoleTheme | undefined): ResolvedTheme;
  export function consoleTransport(options?: ConsoleTransportOptions): Transport;
  export function remoteTransport(options: RemoteTransportOptions): Transport;
  export function jsonTransport(options?: JsonTransportOptions): Transport;
  export function batchTransport(options: BatchTransportOptions): BatchHandle;
  export function sampleTransport(options: SampleTransportOptions): Transport;
  export function redactTransport(options: RedactTransportOptions): Transport;
  export function pipe(...transports: Transport[]): Transport;
  export function pipe(options: PipeOptions, ...transports: Transport[]): Transport;
}
`;

---
title: Rune — API Reference
description: API reference for @vielzeug/rune exports, logger methods, configuration types, and transport factories.
---

[[toc]]

## API Overview

| Symbol               | Purpose                                          | Execution mode | Common gotcha                                                |
| -------------------- | ------------------------------------------------ | -------------- | ------------------------------------------------------------ |
| `createLogger()`     | Create an isolated `Logger` instance             | Sync           | Omitting `transports` defaults to `consoleTransport()`       |
| `lazy(fn)`           | Defer a binding value past the level check       | Sync           | Factory runs on every emit, not once                         |
| `isLevelEnabled()`   | Utility: test whether a level passes a threshold | Sync           | `'off'` always returns `false`                               |
| `PRIORITY`           | Numeric priority table backing `isLevelEnabled()`| —              | Lower number = more verbose                                  |
| `resolveTheme()`     | Merge a partial theme onto the default           | Sync           | Returns a fully-populated `ResolvedTheme`                    |
| `consoleTransport()` | Styled console output                            | Sync           | Theme is resolved once at factory call, not per entry        |
| `jsonTransport()`    | NDJSON to stdout or a custom sink                | Sync           | `process.stdout` is unavailable in browsers                  |
| `remoteTransport()`  | Asynchronous remote delivery                     | Async          | Pass `onError` for production failure observability          |
| `batchTransport()`   | Serialized buffered delivery                     | Async          | Await `dispose()` during shutdown                             |
| `sampleTransport()`  | Probabilistic forwarding                          | Sync           | Validate the downstream delivery path independently          |
| `redactTransport()`  | Recursive sensitive-field masking                 | Sync           | Deeper subtrees are replaced when `maxDepth` is exceeded     |

## Package Entry Point

| Import           | Purpose                                                  |
| ---------------- | -------------------------------------------------------- |
| `@vielzeug/rune` | All exports — logger, transport factories, `lazy`, types |

## createLogger(initial?, options?)

Creates an isolated logger instance.

```ts
createLogger(namespace: string, options?: Omit<RuneOptions, 'namespace'>): Logger
createLogger(options?: RuneOptions): Logger
```

- `string` shorthand sets namespace: `createLogger('api')` or `createLogger('api', { logLevel: 'warn' })`.
- Each call produces a fully independent instance — no shared mutable state.
- Default transport is `consoleTransport()` when `transports` is omitted.

> **Note — disposed loggers:** after `dispose()` is called, all log methods (`debug`, `info`, `warn`, `error`, `fatal`), `time()`, and `group()` / `groupCollapsed()` silently no-op. The `fn` callback in `group()` still runs — only the group header is suppressed.

> **Note — fault isolation:** if middleware throws, that entry is dropped; if a transport throws synchronously, sibling transports still run. Asynchronous delivery failures belong to the transport and should be observed through options such as `remoteTransport({ onError })`.

**Returns:** `Logger`

**Example:**

```ts
import { consoleTransport, createLogger, jsonTransport } from '@vielzeug/rune';

const log = createLogger({ logLevel: 'warn', namespace: 'app' });

const serverLog = createLogger({
  namespace: 'server',
  transports: [
    consoleTransport(),
    jsonTransport({ level: 'error' }),
  ],
});
```

## lazy(fn)

Defers evaluation of an expensive binding value until after the level check passes.
The factory function is never called when the log level suppresses the entry.

```ts
lazy(fn: () => unknown): LazyBinding
```

```ts
import { lazy } from '@vielzeug/rune';

const reqLog = log.withBindings({
  diagnostics: lazy(() => buildExpensiveDiagnostics()),
});

reqLog.debug('trace'); // diagnostics() only called when debug is enabled
```

**Returns:** `LazyBinding`

## Logger Methods

### Logging

All five methods use `LogMethod`:

```ts
(message: string, context?: Bindings): void
(context: Bindings, message?: string): void
(error: Error, message?: string): void
(error: Error, context: Bindings, message?: string): void
```

Message-first is preferred for ordinary logs. Context-first supports structured events and adapters. Error-first stores the serialized error under `err`.

```ts
log.info('request started', { requestId: 'abc' });
log.debug({ type: 'dispatch' }, 'bus:dispatch');
log.error(new Error('timeout'), { requestId: 'abc' }, 'request failed');
```

### Composition

| Method                 | Returns  | What it does                                                     |
| ---------------------- | -------- | ---------------------------------------------------------------- |
| `child(overrides?)`    | `Logger` | Clones config, applies overrides, inherits bindings              |
| `use(middleware)`      | `Logger` | Adds an immutable pre-dispatch transform or filter               |
| `withBindings(fields)` | `Logger` | Pins fields to every subsequent call, returns a new child logger |

`child()` transport inheritance:

- Omit `transports` → inherit parent transports (default).
- Pass `transports: []` → disable all transports on the child.
- Pass `transports: [...]` → replace entirely with the given list.

`child()` namespace joining:

- `parent.child({ namespace: 'auth' })` on a logger with namespace `'api'` produces `'api.auth'`.
- Omit `namespace` → inherits parent namespace unchanged.

### Utilities

| Method                              | Returns   | Description                                                                                                                                                                                |
| ----------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `enabled(level)`                    | `boolean` | True if entries at this level pass the configured threshold                                                                                                                                |
| `time(label, fn, level?)`           | `T`       | Measures sync/async execution; emits at `level` (default `'debug'`), label as message, `{ duration_ms }` in `data`. When `fn` throws or rejects, `{ err }` is also included.               |
| `group(label, fn, level?)`          | `T`       | Wraps callback in `console.group`; closes even on throw/reject. Pass `level` to gate the group header on the configured threshold (e.g. `'debug'` suppresses when `logLevel` is `'warn'`). |
| `groupCollapsed(label, fn, level?)` | `T`       | Same as `group`, using `console.groupCollapsed`.                                                                                                                                           |
| `dispose()`                         | `void`    | Silences all subsequent log calls on this logger instance. Idempotent.                                                                                                                     |

### Properties

| Property           | Type                       | Description                                                        |
| ------------------ | -------------------------- | ------------------------------------------------------------------ |
| `logLevel`         | `LogLevel`                 | Active log level threshold                                         |
| `namespace`        | `string`                   | Effective namespace string                                         |
| `transports`       | `readonly Transport[]`     | Transport pipeline snapshot                                        |
| `middleware`       | `readonly LogMiddleware[]` | Middleware pipeline snapshot                                       |
| `bindings`         | `Readonly<Bindings>`       | Snapshot of currently pinned fields                                |
| `disposalSignal`   | `AbortSignal`              | Aborted when `dispose()` is called. Use to tie external lifetimes. |
| `disposed`         | `boolean`                  | `true` after `dispose()` has been called                           |
| `[Symbol.dispose]` | `() => void`               | Delegates to `dispose()`. Enables `using` declarations.            |

## Transport Factories

### consoleTransport(options?)

```ts
consoleTransport(options?: ConsoleTransportOptions): Transport
```

Writes styled output to the browser console (CSS badges) or Node terminal (plain text). This is the default transport.

| Option      | Type                     | Default   | Description                                         |
| ----------- | ------------------------ | --------- | --------------------------------------------------- |
| `level`     | `LogLevel`               | `'debug'` | Minimum level to output                             |
| `timestamp` | `boolean`                | `true`    | Include `HH:MM:SS.mmm`                              |
| `ansi`      | `boolean`                | auto      | Force ANSI color codes on/off (Node only)           |
| `format`    | `'json' \| 'raw'`        | `'raw'`   | Context serialization: `'json'` uses JSON.stringify |
| `inspectFn` | `(v: unknown) => string` | —         | Custom object formatter (e.g. `util.inspect`)       |
| `theme`     | `ConsoleTheme`           | —         | Override default badge colours for this transport   |

**Returns:** `Transport`

**Example:**

```ts
import { consoleTransport, createLogger } from '@vielzeug/rune';
import { inspect } from 'node:util';

const log = createLogger({
  transports: [consoleTransport({ level: 'info', timestamp: true, inspectFn: inspect })],
});
```

### jsonTransport(options?)

```ts
jsonTransport(options?: JsonTransportOptions): Transport
```

Outputs newline-delimited JSON (NDJSON) to `stdout` or a custom function. Useful for server-side log aggregation pipelines (ELK, Datadog, etc.).

Each line is a flat JSON object with `level`, `time` (ISO), and optional `ns`, `msg`, plus all merged context fields.

| Option   | Type                           | Default          | Description                                                                            |
| -------- | ------------------------------ | ---------------- | -------------------------------------------------------------------------------------- |
| `level`  | `LogLevel`                     | `'debug'`        | Minimum level                                                                          |
| `output` | `(line: string) => void`       | `process.stdout` | Custom output sink                                                                     |
| `safe`   | `boolean`                      | `false`          | Replace circular references with `'[Circular]'` instead of throwing                    |
| `fields` | `{ level?, msg?, ns?, time? }` | —                | Custom output field names for aggregator compatibility (e.g. `'severity'` for Datadog) |

**Returns:** `Transport`

**Example:**

```ts
import { createLogger, jsonTransport } from '@vielzeug/rune';

const log = createLogger({
  namespace: 'api',
  transports: [jsonTransport({ level: 'info' })],
});

log.info('request', { path: '/users', status: 200 });
// {"path":"/users","status":200,"level":"info","time":"2026-05-30T...","ns":"api","msg":"request"}
```

### remoteTransport(options)

```ts
remoteTransport(options: RemoteTransportOptions): Transport
```

| Option    | Type                                                          | Default       | Description                    |
| --------- | ------------------------------------------------------------- | ------------- | ------------------------------ |
| `handler` | `(level, data) => void \| Promise<unknown>`                       | required      | Remote delivery function       |
| `level`   | `LogLevel`                                                    | `'debug'`     | Minimum forwarded level        |
| `env`     | `'development' \| 'production'`                               | auto-detected | Payload environment            |
| `onError` | `(error: unknown, data: RemoteLogData) => void`                | dev warning   | Delivery failure observer      |

**Returns:** A fire-and-forget `Transport`. Pass `onError` whenever production delivery failures require monitoring.

```ts
import { remoteTransport } from '@vielzeug/rune';

const remote = remoteTransport({
  handler: (_level, data) => fetch('/api/logs', { body: JSON.stringify(data), method: 'POST' }),
  onError: (error) => console.error('log delivery failed', error),
});
```

### batchTransport(options)

```ts
batchTransport(options: BatchTransportOptions): BatchHandle
```

| Option         | Type                                          | Default   | Description                         |
| -------------- | --------------------------------------------- | --------- | ----------------------------------- |
| `onFlush`      | `(entries) => void \| Promise<void>`          | required  | Serialized batch delivery           |
| `onFlushError` | `(entries, error) => void`                    | —         | Delivery failure observer           |
| `interval`     | `number`                                      | `5000`    | Flush interval in milliseconds      |
| `maxSize`      | `number`                                      | `50`      | Entries that trigger an early flush |
| `maxBuffer`    | `number`                                      | unbounded | Hard in-memory limit                |
| `level`        | `LogLevel`                                    | `'debug'` | Minimum buffered level              |

**Returns:** `BatchHandle` with `transport`, `flush()`, `dispose()`, `disposed`, and `[Symbol.asyncDispose]`. Await `dispose()` during shutdown.

```ts
import { batchTransport, createLogger } from '@vielzeug/rune';

const batch = batchTransport({
  onFlush: (entries) => fetch('/api/log-batches', { body: JSON.stringify(entries), method: 'POST' }),
});
const log = createLogger({ transports: [batch.transport] });
await batch.dispose();
```

### sampleTransport(options)

```ts
sampleTransport(options: SampleTransportOptions): Transport
```

| Option      | Type        | Default   | Description                    |
| ----------- | ----------- | --------- | ------------------------------ |
| `rate`      | `number`    | required  | Forwarding fraction from 0–1   |
| `transport` | `Transport` | required  | Downstream transport           |
| `level`     | `LogLevel`  | `'debug'` | Minimum level before sampling  |

**Returns:** A sampling `Transport`.

```ts
import { remoteTransport, sampleTransport } from '@vielzeug/rune';

const remote = remoteTransport({ handler: (_level, data) => fetch('/api/logs', { body: JSON.stringify(data) }) });
const sampled = sampleTransport({ rate: 0.1, transport: remote });
```

### redactTransport(options)

```ts
redactTransport(options: RedactTransportOptions): Transport
```

| Option        | Type                | Default        | Description                                      |
| ------------- | ------------------- | -------------- | ------------------------------------------------ |
| `keys`        | `readonly string[]` | required       | Exact field names redacted at any inspected depth |
| `transport`   | `Transport`         | required       | Downstream transport                             |
| `maxDepth`    | `number`            | `20`           | Maximum nested object depth inspected            |
| `replacement` | `string`            | `'[REDACTED]'` | Replacement for keys and deeper subtrees         |

**Returns:** A non-mutating redaction `Transport`. When `maxDepth` is exceeded, the whole deeper subtree is replaced; uninspected values are never forwarded.

```ts
import { jsonTransport, redactTransport } from '@vielzeug/rune';

const safeJson = redactTransport({ keys: ['password', 'token'], transport: jsonTransport() });
```

## Utilities

### isLevelEnabled(threshold, level)

```ts
isLevelEnabled(threshold: LogLevel, level: LogLevel): boolean
```

Returns `true` when `level` is at or above `threshold`. Always returns `false` when `level` is `'off'`. Useful for building custom transports that respect level filtering.

```ts
import { isLevelEnabled } from '@vielzeug/rune';

isLevelEnabled('warn', 'error'); // true
isLevelEnabled('warn', 'info'); // false
isLevelEnabled('debug', 'off'); // false
```

### resolveTheme(override?)

```ts
resolveTheme(override: ConsoleTheme | undefined): ResolvedTheme
```

Deep-merges a partial `ConsoleTheme` override onto `DEFAULT_THEME`. Returns a fully-populated `ResolvedTheme` where every level and every field is present. Used internally by `consoleTransport()` — call directly when building a custom transport that needs to honour theme overrides.

```ts
import { resolveTheme } from '@vielzeug/rune';

const theme = resolveTheme({ warn: { badge: '⚡' } });
// theme.warn.badge === '⚡', theme.warn.bg === DEFAULT_THEME.warn.bg (unchanged)
```

### DEFAULT_THEME

The built-in badge and namespace colour definitions used by `consoleTransport()`. Override per-transport via `ConsoleTransportOptions.theme`.

### PRIORITY

```ts
PRIORITY: Record<LogLevel, number>
```

Numeric priority for each level (`debug: 0`, `info: 1`, `warn: 2`, `error: 3`, `fatal: 4`, `off: 5`) — lower is more verbose. Exported for transport authors building custom level-comparison logic; `isLevelEnabled()` is built directly on top of it.

## Types

### LogType

`'debug' | 'error' | 'fatal' | 'info' | 'warn'`

### LogLevel

`LogType | 'off'` — threshold order: `debug < info < warn < error < fatal < off`

### Bindings

`Record<string, unknown>` — Key-value context pinned via `withBindings()` or passed per-call.

### LogEntry

The structured record produced by every log call and dispatched to all transports.

| Field       | Type                 | Description                                                              |
| ----------- | -------------------- | ------------------------------------------------------------------------ |
| `data`      | `Readonly<Bindings>` | Merged result of pinned bindings and per-call context — already resolved |
| `level`     | `LogType`            | Log level                                                                |
| `message`   | `string?`            | Log message                                                              |
| `namespace` | `string`             | Effective namespace at time of call                                      |
| `timestamp` | `Date`               | Exact moment of the call, shared across transports                       |

### Transport

```ts
type Transport = (entry: LogEntry) => void;
```

Receives every `LogEntry` that passes the logger's level threshold. Responsible for its own formatting, delivery, and per-transport level filtering.

### ConsoleThemeEntry

```ts
type ConsoleThemeEntry = {
  badge: string;
  bg: string;
  border: string;
  color: string;
};
```

Per-level style definition for the console transport. All fields are optional when providing a level override — unspecified fields fall back to the default theme.

### ConsoleTheme

```ts
type ConsoleTheme = Partial<Record<LogType | 'group' | 'ns', Partial<ConsoleThemeEntry>>>;
```

Partial theme overrides merged on top of the default theme. Each level entry is also partial — only specify the fields you want to change.

### ResolvedTheme

`Record<LogType | 'group' | 'ns', ConsoleThemeEntry>` — fully resolved theme with all fields populated.

### RuneOptions

| Field        | Type           | Default                | Description                  |
| ------------ | -------------- | ---------------------- | ---------------------------- |
| `logLevel`   | `LogLevel?`    | `'debug'`              | Logger level threshold       |
| `namespace`  | `string?`      | `''`                   | Namespace prefix             |
| `transports` | `Transport[]?`   | `[consoleTransport()]` | Transport pipeline           |
| `middleware` | `LogMiddleware[]?` | `[]`                | Pre-dispatch transform/filter pipeline |
| `bindings`   | `Bindings?`      | `{}`                   | Initial pinned bindings      |

### LogMethod

```ts
type LogMethod = {
  (message: string, context?: Bindings): void;
  (context: Bindings, message?: string): void;
  (error: Error, message?: string): void;
  (error: Error, context: Bindings, message?: string): void;
};
```

Message-first, context-first, and Error-first calls are supported. Top-level `Error` values are serialized to `{ message, name, stack }`.

### LazyBinding

Opaque type returned by `lazy()`. Pass as a value inside `withBindings()`. The factory is only called when the entry is actually emitted (after the level check passes).

### Logger

The full interface returned by `createLogger()`:

```ts
type Logger = {
  [Symbol.dispose]: () => void;
  readonly bindings: Readonly<Bindings>;
  child: (overrides?: RuneOptions) => Logger;
  debug: LogMethod;
  readonly disposalSignal: AbortSignal;
  dispose: () => void;
  readonly disposed: boolean;
  enabled: (type: LogLevel) => boolean;
  error: LogMethod;
  fatal: LogMethod;
  group: <T>(label: string, fn: () => T, level?: LogType) => T;
  groupCollapsed: <T>(label: string, fn: () => T, level?: LogType) => T;
  info: LogMethod;
  readonly logLevel: LogLevel;
  readonly middleware: readonly LogMiddleware[];
  readonly namespace: string;
  time: <T>(label: string, fn: () => T, level?: LogType) => T;
  readonly transports: readonly Transport[];
  use: (middleware: LogMiddleware) => Logger;
  warn: LogMethod;
  withBindings: (bindings: Bindings) => Logger;
};
```

### ConsoleTransportOptions

| Field       | Type                     | Default   | Description                                         |
| ----------- | ------------------------ | --------- | --------------------------------------------------- |
| `level`     | `LogLevel`               | `'debug'` | Minimum level to output                             |
| `timestamp` | `boolean`                | `true`    | Include `HH:MM:SS.mmm`                              |
| `ansi`      | `boolean`                | auto      | Force ANSI color codes on/off (Node only)           |
| `format`    | `'json' \| 'raw'`        | `'raw'`   | Context serialization: `'json'` uses JSON.stringify |
| `inspectFn` | `(v: unknown) => string` | —         | Custom object formatter (e.g. `util.inspect`)       |
| `theme`     | `ConsoleTheme`           | —         | Override default badge colours for this transport   |

### JsonTransportOptions

| Field    | Type                           | Default          | Description                                                         |
| -------- | ------------------------------ | ---------------- | ------------------------------------------------------------------- |
| `level`  | `LogLevel`                     | `'debug'`        | Minimum level                                                       |
| `output` | `(line: string) => void`       | `process.stdout` | Custom output sink                                                  |
| `safe`   | `boolean`                      | `false`          | Replace circular references with `'[Circular]'` instead of throwing |
| `fields` | `{ level?, msg?, ns?, time? }` | —                | Custom output field names (e.g. `level: 'severity'` for Datadog)    |

### LogMiddleware

```ts
type LogMiddleware = (entry: LogEntry) => LogEntry | null;
```

Transforms an entry before all transports or returns `null` to drop it.

### RemoteLogData and RemoteTransportOptions

```ts
type RemoteLogData = {
  data?: Readonly<Bindings>;
  env: 'development' | 'production';
  level: LogType;
  message?: string;
  namespace?: string;
  timestamp: string;
};

type RemoteTransportOptions = {
  env?: 'development' | 'production';
  handler: (type: LogType, data: RemoteLogData) => void | Promise<unknown>;
  level?: LogLevel;
  onError?: (error: unknown, data: RemoteLogData) => void;
};
```

### BatchHandle and BatchTransportOptions

```ts
type BatchHandle = {
  [Symbol.asyncDispose]: () => Promise<void>;
  dispose: () => Promise<void>;
  readonly disposed: boolean;
  flush: () => Promise<void>;
  transport: Transport;
};

type BatchTransportOptions = {
  interval?: number;
  level?: LogLevel;
  maxBuffer?: number;
  maxSize?: number;
  onFlush: (entries: LogEntry[]) => void | Promise<void>;
  onFlushError?: (entries: LogEntry[], error: unknown) => void;
};
```

### SampleTransportOptions

```ts
type SampleTransportOptions = {
  level?: LogLevel;
  rate: number;
  transport: Transport;
};
```

### RedactTransportOptions

```ts
type RedactTransportOptions = {
  keys: readonly string[];
  maxDepth?: number;
  replacement?: string;
  transport: Transport;
};
```

Depth-limited subtrees are replaced entirely so sensitive values are never forwarded uninspected.

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `RuneError` | Base class for all rune-originated errors | `instanceof RuneError` narrows all Rune errors |
| `RuneConfigError` | Logger or transport configured with invalid options | — |

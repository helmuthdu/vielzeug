---
title: Rune — API Reference
description: API reference for @vielzeug/rune exports, logger methods, configuration types, and transport factories.
---

[[toc]]

## API Overview

| Symbol               | Purpose                                          | Execution mode | Common gotcha                                                |
| -------------------- | ------------------------------------------------ | -------------- | ------------------------------------------------------------ |
| `createLogger()`     | Create an isolated `Logger` instance             | Sync           | Omitting `transports` defaults to `consoleTransport()`       |
| `Rune`               | Pre-created default logger singleton             | —              | Shared instance — use `child()` or `withBindings()` to scope |
| `lazy(fn)`           | Defer a binding value past the level check       | Sync           | Factory runs on every emit, not once                         |
| `pipe()`             | Fan-out dispatcher to multiple transports        | Sync           | Errors in one transport don't propagate to others            |
| `isLevelEnabled()`   | Utility: test whether a level passes a threshold | Sync           | `'off'` always returns `false`                               |
| `resolveTheme()`     | Merge a partial theme onto the default           | Sync           | Returns a fully-populated `ResolvedTheme`                    |
| `consoleTransport()` | Styled console output                            | Sync           | Theme is resolved once at factory call, not per entry        |
| `remoteTransport()`  | Async HTTP/webhook delivery                      | Async          | Handler errors are swallowed to `console.warn`               |
| `jsonTransport()`    | NDJSON to stdout or a custom sink                | Sync           | `process.stdout` is unavailable in browsers                  |
| `batchTransport()`   | Buffered batch delivery with flush interval      | Sync/Interval  | Must call `.dispose()` on shutdown to flush remaining        |
| `sampleTransport()`  | Probabilistic entry forwarding                   | Sync           | `rate: 1` forwards all entries; `rate: 0` forwards none      |
| `redactTransport()`  | Sensitive field stripping before forwarding      | Sync           | Place this closest to the remote transport, not console      |

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

**Returns:** `Logger`

**Example:**

```ts
import { createLogger } from '@vielzeug/rune';
import { consoleTransport, remoteTransport } from '@vielzeug/rune';

const log = createLogger({ logLevel: 'warn', namespace: 'app' });

const serverLog = createLogger({
  namespace: 'server',
  transports: [
    consoleTransport(),
    remoteTransport({
      handler: async (type, data) => {
        await fetch('/api/logs', { body: JSON.stringify(data), method: 'POST' });
      },
      level: 'error',
    }),
  ],
});
```

## Rune

`Rune` is the pre-created default logger (`createLogger()` called once at module load).

Use it as a quick-start singleton or create a child for module-level use:

```ts
import { Rune } from '@vielzeug/rune';

const log = Rune.child({ namespace: 'app.worker' });
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

All five methods share the same signature:

```ts
log.debug / info / warn / error / fatal(message: string): void
log.debug / info / warn / error / fatal(error: Error, context?: Bindings, message?: string): void
log.debug / info / warn / error / fatal(context: Bindings, message?: string): void
```

Argument rules:

- String-only calls accept a single message argument.
- **Error-first form:** pass an `Error` as the first argument — it is auto-serialized to `{ message, name, stack }` under the `err` key. Optionally follow with a `Bindings` object and/or a message string.
- Context object comes first when providing structured data without a top-level Error. `Error` values inside the context object are also auto-serialized to `{ message, name, stack }`.

```ts
log.error(err, 'request failed'); // err auto-serialized to data.err
log.error(err, { requestId }, 'request failed'); // err + context + message
log.error({ err: new Error('boom') }, 'failed'); // Error nested in context object
```

### Composition

| Method                 | Returns  | What it does                                                      |
| ---------------------- | -------- | ----------------------------------------------------------------- |
| `child(overrides?)`    | `Logger` | Clones config, applies overrides, inherits bindings               |
| `withBindings(fields)` | `Logger` | Pins fields to every subsequent call, returns a new child logger  |
| `use(middleware)`      | `Logger` | Appends a middleware function to the pipeline, returns new logger |

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
| `dispose()`                         | `void`    | Silences all subsequent log calls on this logger instance. Does **not** auto-dispose batch transports — hold a reference and call `batchTransport.dispose()` on shutdown. Idempotent.      |

### Properties

| Property           | Type                       | Description                                                        |
| ------------------ | -------------------------- | ------------------------------------------------------------------ |
| `logLevel`         | `LogLevel`                 | Active log level threshold                                         |
| `namespace`        | `string`                   | Effective namespace string                                         |
| `middleware`       | `readonly LogMiddleware[]` | Middleware pipeline snapshot                                       |
| `transports`       | `readonly Transport[]`     | Transport pipeline snapshot                                        |
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

### remoteTransport(options)

```ts
remoteTransport(options: RemoteTransportOptions): Transport
```

Forwards entries asynchronously to a remote handler. Fire-and-forget — handler errors are swallowed to `console.warn` and never propagate to the caller.

| Option    | Type                            | Default       | Description                                                                                                                                                     |
| --------- | ------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `handler` | `RemoteHandler`                 | —             | Required. Receives each forwarded entry                                                                                                                         |
| `level`   | `LogLevel`                      | `'debug'`     | Minimum level to forward                                                                                                                                        |
| `env`     | `'production' \| 'development'` | auto-detected | Override the runtime environment marker                                                                                                                         |
| `onError` | `(error: unknown) => void`      | —             | Called when the handler throws or rejects. Default: a dev-only `console.warn`. Silent in production — provide an explicit handler for production observability. |

**Returns:** `Transport`

**Example:**

```ts
import { createLogger, remoteTransport } from '@vielzeug/rune';

const log = createLogger({
  transports: [
    remoteTransport({
      handler: async (type, data) => {
        await fetch('/api/logs', { body: JSON.stringify(data), method: 'POST' });
      },
      level: 'error',
    }),
  ],
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

log.info({ path: '/users', status: 200 }, 'request');
// {"path":"/users","status":200,"level":"info","time":"2026-05-30T...","ns":"api","msg":"request"}
```

### batchTransport(options)

```ts
batchTransport(options: BatchTransportOptions): BatchHandle
```

Buffers entries and delivers them in batches. Flushes when the buffer reaches `maxSize` or after `interval` elapses.

| Option         | Type                                             | Default   | Description                                                                             |
| -------------- | ------------------------------------------------ | --------- | --------------------------------------------------------------------------------------- |
| `onFlush`      | `(entries: LogEntry[]) => void \| Promise<void>` | —         | Required. Receives each batch (may be async)                                            |
| `onFlushError` | `(entries: LogEntry[], error: unknown) => void`  | —         | Called when `onFlush` throws or rejects                                                 |
| `level`        | `LogLevel`                                       | `'debug'` | Minimum level to buffer                                                                 |
| `interval`     | `number`                                         | `5000`    | Flush interval in milliseconds                                                          |
| `maxSize`      | `number`                                         | `50`      | Max buffer size before an early flush                                                   |
| `maxBuffer`    | `number`                                         | unbounded | Hard cap — oldest entries are dropped silently when exceeded. Does not trigger a flush. |

Returns a `BatchHandle` with:

- `.transport` — the `Transport` function to pass to `createLogger({ transports: [handle.transport] })`.
- `.flush()` — immediately send buffered entries without stopping the timer.
- `.dispose()` — stop the interval and flush remaining entries. **Call on shutdown.** Idempotent.
- `[Symbol.dispose]()` — delegates to `.dispose()`. Enables `using` declarations.

After `dispose()`, the transport becomes inert: new entries are silently dropped.

**Returns:** `BatchHandle`

**Example:**

```ts
import { batchTransport, createLogger } from '@vielzeug/rune';

const batch = batchTransport({
  onFlush: (entries) => sendToCollector(entries),
  interval: 10_000,
  maxSize: 100,
});

// Pass batch.transport to the logger — batch holds flush/dispose
const log = createLogger({ transports: [batch.transport] });

process.on('exit', () => batch.dispose());
```

### sampleTransport(options)

```ts
sampleTransport(options: SampleTransportOptions): Transport
```

Probabilistically forwards entries to a downstream transport.

| Option      | Type        | Default   | Description                                    |
| ----------- | ----------- | --------- | ---------------------------------------------- |
| `rate`      | `number`    | —         | Required. Fraction of entries to forward (0–1) |
| `transport` | `Transport` | —         | Required. Downstream transport                 |
| `level`     | `LogLevel`  | `'debug'` | Minimum level to sample                        |

**Returns:** `Transport`

**Example:**

```ts
import { createLogger, remoteTransport, sampleTransport } from '@vielzeug/rune';

const log = createLogger({
  transports: [
    sampleTransport({
      rate: 0.1,
      transport: remoteTransport({ handler }),
    }),
  ],
});
```

### redactTransport(options)

```ts
redactTransport(options: RedactTransportOptions): Transport
```

Strips sensitive fields from `bindings` and `context` before forwarding. Redaction is applied recursively at any depth (up to 20 levels).

::: warning Key matching
`keys` matches **exact field names** at any nesting depth. Dot-path notation (e.g. `'user.password'`) is **not** supported — use `'password'` to redact every field named `password` regardless of nesting.
:::

| Option        | Type        | Default        | Description                     |
| ------------- | ----------- | -------------- | ------------------------------- |
| `keys`        | `string[]`  | —              | Required. Field names to redact |
| `replacement` | `string`    | `'[REDACTED]'` | Replacement value               |
| `transport`   | `Transport` | —              | Required. Downstream transport  |

**Returns:** `Transport`

**Example:**

```ts
import { createLogger, redactTransport, remoteTransport } from '@vielzeug/rune';

const log = createLogger({
  transports: [
    redactTransport({
      keys: ['password', 'token', 'ssn'],
      transport: remoteTransport({ handler }),
    }),
  ],
});
```

### pipe(...transports) / pipe(options, ...transports)

```ts
pipe(...transports: Transport[]): Transport
pipe(options: PipeOptions, ...transports: Transport[]): Transport
```

Dispatches each `LogEntry` to every transport in the list independently. An error thrown by one transport does not stop the others. Use in place of separate array entries when you want fault isolation or a shared error observer.

`pipe()` with no arguments creates a valid no-op transport — useful for conditional pipeline construction: `pipe(condition ? remoteTransport(opts) : undefined!)` pattern, or simply as a placeholder during development.

| Option    | Type                                        | Description                                               |
| --------- | ------------------------------------------- | --------------------------------------------------------- |
| `onError` | `(error: unknown, entry: LogEntry) => void` | Called with the error and entry when any transport throws |

**Returns:** `Transport`

**Example:**

```ts
import { consoleTransport, createLogger, pipe, remoteTransport } from '@vielzeug/rune';

const log = createLogger({
  transports: [
    pipe(
      { onError: (err) => metrics.increment('log.transport.error') },
      consoleTransport(),
      remoteTransport({ handler, level: 'error' }),
    ),
  ],
});
```

````

## Utilities

### isLevelEnabled(threshold, level)

```ts
isLevelEnabled(threshold: LogLevel, level: LogLevel): boolean
````

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

### RemoteLogData

Payload shape delivered to `RemoteHandler`:

| Field       | Type                            | Description                               |
| ----------- | ------------------------------- | ----------------------------------------- |
| `data`      | `Bindings?`                     | Merged structured data (omitted if empty) |
| `env`       | `'production' \| 'development'` | Runtime env marker                        |
| `level`     | `LogType`                       | Log level                                 |
| `message`   | `string?`                       | Log message                               |
| `namespace` | `string?`                       | Effective namespace                       |
| `timestamp` | `string`                        | Full ISO timestamp                        |

### RemoteHandler

`(type: LogType, data: RemoteLogData) => void`

### PipeOptions

| Field     | Type                                        | Description                                           |
| --------- | ------------------------------------------- | ----------------------------------------------------- |
| `onError` | `(error: unknown, entry: LogEntry) => void` | Called when a transport in the pipe throws or rejects |

### ResolvedTheme

`Record<LogType | 'group' | 'ns', ConsoleThemeEntry>` — fully resolved theme with all fields populated.

### RuneOptions

| Field        | Type               | Default                | Description                  |
| ------------ | ------------------ | ---------------------- | ---------------------------- |
| `logLevel`   | `LogLevel?`        | `'debug'`              | Logger level threshold       |
| `namespace`  | `string?`          | `''`                   | Namespace prefix             |
| `transports` | `Transport[]?`     | `[consoleTransport()]` | Transport pipeline           |
| `bindings`   | `Bindings?`        | `{}`                   | Initial pinned bindings      |
| `middleware` | `LogMiddleware[]?` | `[]`                   | Entry transform/filter chain |

### LogMethod

```ts
type LogMethod = {
  (message: string): void;
  (error: Error, context?: Bindings, message?: string): void;
  (context: Bindings, message?: string): void;
};
```

Every log-level method uses this signature. Three call forms are supported:

- **String-only:** `log.info('message')`
- **Error-first:** `log.error(err, { requestId }, 'failed')` — `Error` is auto-serialized to `{ message, name, stack }` under `data.err`. Optionally follow with a `Bindings` object and/or a message string.
- **Context-first:** `log.info({ key: 'value' }, 'message')` — structured context object, optional message. `Error` values nested inside the context are also auto-serialized.

### LogMiddleware

```ts
type LogMiddleware = (entry: LogEntry) => LogEntry | null;
```

Middleware functions intercept entries before they reach transports. Return the (optionally mutated) entry to continue, or return `null` to drop the entry. Added via `use(fn)` or `RuneOptions.middleware`.

### LazyBinding

Opaque type returned by `lazy()`. Pass as a value inside `withBindings()`. The factory is only called when the entry is actually emitted (after the level check passes).

### BatchHandle

```ts
type BatchHandle = {
  [Symbol.dispose]: () => void;
  dispose: () => void;
  flush: () => void;
  transport: Transport;
};
```

Returned by `batchTransport()`. Pass `handle.transport` to `createLogger({ transports })`; call `handle.dispose()` on shutdown.

### Logger

The full interface returned by `createLogger()` and `Rune`:

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
  /** Returns a new child logger with additional pinned bindings. The returned logger is fully independent — disposing it does not affect the parent, and vice versa. */
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

### RemoteTransportOptions

| Field     | Type                            | Default       | Description                             |
| --------- | ------------------------------- | ------------- | --------------------------------------- |
| `handler` | `RemoteHandler`                 | —             | Required. Receives each forwarded entry |
| `level`   | `LogLevel`                      | `'debug'`     | Minimum level to forward                |
| `env`     | `'production' \| 'development'` | auto-detected | Override the runtime environment marker |
| `onError` | `(error: unknown) => void`      | —             | Called when the handler throws          |

### JsonTransportOptions

| Field    | Type                           | Default          | Description                                                         |
| -------- | ------------------------------ | ---------------- | ------------------------------------------------------------------- |
| `level`  | `LogLevel`                     | `'debug'`        | Minimum level                                                       |
| `output` | `(line: string) => void`       | `process.stdout` | Custom output sink                                                  |
| `safe`   | `boolean`                      | `false`          | Replace circular references with `'[Circular]'` instead of throwing |
| `fields` | `{ level?, msg?, ns?, time? }` | —                | Custom output field names (e.g. `level: 'severity'` for Datadog)    |

### BatchTransportOptions

| Field          | Type                                             | Default   | Description                                               |
| -------------- | ------------------------------------------------ | --------- | --------------------------------------------------------- |
| `onFlush`      | `(entries: LogEntry[]) => void \| Promise<void>` | —         | Required. Receives each batch (may be async)              |
| `onFlushError` | `(entries: LogEntry[], error: unknown) => void`  | —         | Called when `onFlush` throws or rejects                   |
| `level`        | `LogLevel`                                       | `'debug'` | Minimum level to buffer                                   |
| `interval`     | `number`                                         | `5000`    | Flush interval in milliseconds                            |
| `maxSize`      | `number`                                         | `50`      | Max buffer size before an early flush                     |
| `maxBuffer`    | `number`                                         | unbounded | Hard cap — drops oldest when exceeded, no flush triggered |

### SampleTransportOptions

| Field       | Type        | Default   | Description                                    |
| ----------- | ----------- | --------- | ---------------------------------------------- |
| `rate`      | `number`    | —         | Required. Fraction of entries to forward (0–1) |
| `transport` | `Transport` | —         | Required. Downstream transport                 |
| `level`     | `LogLevel`  | `'debug'` | Minimum level to sample                        |

### RedactTransportOptions

| Field         | Type        | Default        | Description                                                                                                                                                                                                                                   |
| ------------- | ----------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keys`        | `string[]`  | —              | Required. Field names to redact at any depth                                                                                                                                                                                                  |
| `maxDepth`    | `number`    | `20`           | Maximum object nesting depth to traverse. Fields deeper than this are not redacted — a dev-only warning is emitted when hit. **Security:** the warning is suppressed in production; ensure sensitive fields are not nested beyond this limit. |
| `replacement` | `string`    | `'[REDACTED]'` | Replacement value                                                                                                                                                                                                                             |
| `transport`   | `Transport` | —              | Required. Downstream transport                                                                                                                                                                                                                |

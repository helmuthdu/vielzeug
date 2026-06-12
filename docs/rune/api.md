---
title: Rune — API Reference
description: API reference for @vielzeug/rune exports, logger methods, configuration types, and transport factories.
---

[[toc]]

## API At a Glance

| Symbol               | Purpose                                          | Execution mode | Common gotcha                                                |
| -------------------- | ------------------------------------------------ | -------------- | ------------------------------------------------------------ |
| `createLogger()`     | Create an isolated `Logger` instance             | Sync           | Omitting `transports` defaults to `consoleTransport()`       |
| `Rune`               | Pre-created default logger singleton             | —              | Shared instance — use `child()` or `withBindings()` to scope |
| `lazy(fn)`           | Defer a binding value past the level check       | Sync           | Factory runs on every emit, not once                         |
| `pipe()`             | Fan-out dispatcher to multiple transports        | Sync           | Errors in one transport don't propagate to others            |
| `isLevelEnabled()`   | Utility: test whether a level passes a threshold | Sync           | `'off'` always returns `false`                               |
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

## createLogger(initial?, initialBindings?)

Creates an isolated logger instance.

```ts
createLogger(initial?: RuneOptions | string, initialBindings?: Bindings): Logger
```

- `string` shorthand sets namespace only: `createLogger('api')`.
- Each call produces a fully independent instance — no shared mutable state.
- Default transport is `consoleTransport()` when `transports` is omitted.

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

All five methods share the same overloaded signature:

```ts
log.debug / info / warn / error / fatal(message: string): void
log.debug / info / warn / error / fatal(context: Bindings, message?: string): void
log.debug / info / warn / error / fatal(error: Error, message?: string): void
```

Argument rules:

- String-first calls accept only one argument.
- Context object must be the first argument when providing structured data.
- `Error` instances are auto-serialized into `context.err`; the original message becomes the log message unless overridden.

### Composition

| Method                 | Returns  | What it does                                          |
| ---------------------- | -------- | ----------------------------------------------------- |
| `child(overrides?)`    | `Logger` | Clones config, applies overrides, inherits bindings   |
| `withBindings(fields)` | `Logger` | Pins fields to every subsequent call                  |
| `use(middleware)`      | `Logger` | Appends a middleware function to the processing chain |

`child()` transport inheritance:

- Omit `transports` → inherit parent transports (default).
- Pass `transports: []` → disable all transports on the child.
- Pass `transports: [...]` → replace entirely with the given list.

`child()` namespace joining:

- `parent.child({ namespace: 'auth' })` on a logger with namespace `'api'` produces `'api.auth'`.
- Prefix with `/` to set an absolute namespace: `child({ namespace: '/root' })` → `'root'`.
- Omit `namespace` → inherits parent namespace unchanged.

### Utilities

| Method                              | Returns   | Description                                                                                                                                                                                                                            |
| ----------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled(level)`                    | `boolean` | True if entries at this level pass the configured threshold                                                                                                                                                                            |
| `setLevel(level)`                   | `void`    | Mutates the level threshold in-place. Children created **after** the call inherit the new level; children created before retain their own snapshot.                                                                                    |
| `resetLevel()`                      | `void`    | Restores the log level to the value set at construction time, undoing all `setLevel()` calls.                                                                                                                                          |
| `time(label, fn, opts?)`            | `T`       | Measures sync/async execution; emits at `opts.level` (default `'debug'`), label as message, `{ duration_ms }` in context. When `fn` throws or rejects, `{ err }` is also included. `opts` accepts a `LogType` string or `TimeOptions`. |
| `group(label, fn, level?)`          | `T`       | Wraps callback in `console.group`; closes even on throw/reject. Pass `level` to gate the group header on the configured threshold (e.g. `'debug'` suppresses when `logLevel` is `'warn'`).                                             |
| `groupCollapsed(label, fn, level?)` | `T`       | Same as `group`, using `console.groupCollapsed`.                                                                                                                                                                                       |
| `dispose()`                         | `void`    | Calls `.dispose()` on any `BatchTransport` in the transport array. Idempotent. Only inspects top-level transports (not those inside `pipe()`). Call on shutdown.                                                                      |

### Properties

| Property          | Type                   | Description                                                              |
| ----------------- | ---------------------- | ------------------------------------------------------------------------ |
| `config`          | `Readonly<RuneConfig>` | Snapshot of resolved configuration                                       |
| `bindings`        | `Readonly<Bindings>`   | Snapshot of currently pinned fields                                      |
| `disposalSignal`  | `AbortSignal`          | Aborted when `dispose()` is called. Use to tie external lifetimes.       |
| `disposed`        | `boolean`              | `true` after `dispose()` has been called                                 |
| `[Symbol.dispose]`| `() => void`           | Delegates to `dispose()`. Enables `using` declarations.                  |

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

| Option    | Type                            | Default       | Description                             |
| --------- | ------------------------------- | ------------- | --------------------------------------- |
| `handler` | `RemoteHandler`                 | —             | Required. Receives each forwarded entry |
| `level`   | `LogLevel`                      | `'debug'`     | Minimum level to forward                |
| `env`     | `'production' \| 'development'` | auto-detected | Override the runtime environment marker |
| `onError` | `(error: unknown) => void`      | —             | Called when the handler throws          |

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

| Option   | Type                     | Default          | Description                                                         |
| -------- | ------------------------ | ---------------- | ------------------------------------------------------------------- |
| `level`  | `LogLevel`               | `'debug'`        | Minimum level                                                       |
| `output` | `(line: string) => void` | `process.stdout` | Custom output sink                                                  |
| `safe`   | `boolean`                | `false`          | Replace circular references with `'[Circular]'` instead of throwing |

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
batchTransport(options: BatchTransportOptions): BatchTransport
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

The returned `BatchTransport` adds:

- `.flush()` — immediately send buffered entries without stopping the timer.
- `.dispose()` — stop the interval and flush remaining entries. **Call on shutdown.**

**Returns:** `BatchTransport`

**Example:**

```ts
import { batchTransport, createLogger } from '@vielzeug/rune';

const batch = batchTransport({
  onFlush: (entries) => sendToCollector(entries),
  interval: 10_000,
  maxSize: 100,
});

const log = createLogger({ transports: [batch] });

process.on('exit', () => batch.dispose());
```

### sampleTransport(options)

```ts
sampleTransport(options: SampleTransportOptions): Transport
```

Probabilistically forwards entries to a downstream transport.

| Option      | Type        | Description                                     |
| ----------- | ----------- | ----------------------------------------------- |
| `rate`      | `number`    | Fraction of entries to forward (0–1)            |
| `transport` | `Transport` | Downstream transport to receive sampled entries |

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

### PRIORITY

```ts
const PRIORITY: Record<LogLevel, number>;
```

Exported priority map: `{ debug: 0, info: 1, warn: 2, error: 3, fatal: 4, off: 5 }`. Useful for building custom transports or middleware that perform level comparisons.

### resolveTheme(override?)

```ts
resolveTheme(override?: ConsoleTheme): ResolvedTheme
```

Merges a partial `ConsoleTheme` onto `DEFAULT_THEME` and returns a fully resolved `ResolvedTheme`. Called once at `consoleTransport()` factory time — the resolved theme is captured in a closure and reused per entry.

### DEFAULT_THEME

The built-in badge and namespace colour definitions used by `consoleTransport()`. Override per-transport via `ConsoleTransportOptions.theme` or per-logger via `RuneOptions.theme`.

### DEFAULT_TRANSPORT

The singleton `consoleTransport()` instance reused when no `transports` array is provided to `createLogger()`. Avoids ANSI detection on every call.

## Types

### LogType

`'debug' | 'error' | 'fatal' | 'info' | 'warn'`

### LogLevel

`LogType | 'off'` — threshold order: `debug < info < warn < error < fatal < off`

### Bindings

`Record<string, unknown>` — Key-value context pinned via `withBindings()` or passed per-call.

### LogEntry

The structured record produced by every log call and dispatched to all transports.

| Field       | Type                 | Description                                        |
| ----------- | -------------------- | -------------------------------------------------- |
| `level`     | `LogType`            | Log level                                          |
| `message`   | `string?`            | Log message                                        |
| `context`   | `Bindings?`          | Per-call context object                            |
| `bindings`  | `Readonly<Bindings>` | Pinned bindings after lazy resolution              |
| `namespace` | `string`             | Effective namespace at time of call                |
| `timestamp` | `Date`               | Exact moment of the call, shared across transports |

### Transport

```ts
type Transport = (entry: LogEntry) => void;
```

Receives every `LogEntry` that passes the logger's level threshold. Responsible for its own formatting, delivery, and per-transport level filtering.

### RemoteLogData

Payload shape delivered to `RemoteHandler`:

| Field       | Type                            | Description                        |
| ----------- | ------------------------------- | ---------------------------------- |
| `level`     | `LogType`                       | Log level                          |
| `message`   | `string?`                       | Log message                        |
| `context`   | `Bindings?`                     | Merged bindings + per-call context |
| `env`       | `'production' \| 'development'` | Runtime env marker                 |
| `namespace` | `string?`                       | Effective namespace                |
| `timestamp` | `string`                        | Full ISO timestamp                 |

### RemoteHandler

`(type: LogType, data: RemoteLogData) => void`

### PipeOptions

| Field     | Type                                        | Description                                           |
| --------- | ------------------------------------------- | ----------------------------------------------------- |
| `onError` | `(error: unknown, entry: LogEntry) => void` | Called when a transport in the pipe throws or rejects |

### ResolvedTheme

`Record<LogType | 'group' | 'ns', ConsoleThemeEntry>` — fully resolved theme after merging onto `DEFAULT_THEME`. Returned by `resolveTheme()`.

### RuneOptions

| Field              | Type                            | Default               | Description                                      |
| ------------------ | ------------------------------- | --------------------- | ------------------------------------------------ |
| `logLevel`         | `LogLevel?`                     | `'debug'`             | Logger level threshold                           |
| `namespace`        | `string?`                       | `''`                  | Namespace prefix                                 |
| `transports`       | `Transport[]?`                  | `[DEFAULT_TRANSPORT]` | Transport pipeline                               |
| `bindings`         | `Bindings?`                     | `{}`                  | Initial pinned bindings                          |
| `middleware`       | `LogMiddleware[]?`              | `[]`                  | Entry transform/filter chain                     |
| `now`              | `() => Date`                    | `() => new Date()`    | Timestamp factory (useful in tests)              |
| `onTransportError` | `(error, entry, index) => void` | `console.warn`        | Called when a transport throws synchronously     |
| `sample`           | `number?`                       | `1`                   | Keep probability 0–1; applied after middleware   |
| `theme`            | `ConsoleTheme?`                 | —                     | Theme for console output and `group()` rendering |

### RuneConfig

Resolved configuration exposed via `logger.config`:

```ts
type RuneConfig = {
  logLevel: LogLevel;
  middleware: LogMiddleware[];
  namespace: string;
  now: () => Date;
  onTransportError: (error: unknown, entry: LogEntry, transportIndex: number) => void;
  sample: number;
  theme: ConsoleTheme | undefined;
  transports: Transport[];
};
```

### LogMethod

```ts
type LogMethod = {
  (message: string): void;
  (context: Bindings, message?: string): void;
  (error: Error, message?: string): void;
};
```

Every log-level method uses this signature. Every call must provide at least one argument.

### LogMiddleware

```ts
type LogMiddleware = (entry: LogEntry) => LogEntry | null;
```

Middleware functions intercept entries before they reach transports. Return the (optionally mutated) entry to continue, or return `null` to drop the entry. Added via `use(fn)` or `RuneOptions.middleware`.

### LazyBinding

Opaque type returned by `lazy()`. Pass as a value inside `withBindings()`. The factory is only called when the entry is actually emitted (after the level check passes).

### BatchTransport

```ts
type BatchTransport = Transport & {
  flush: () => void;
  dispose: () => void;
};
```

### Logger

The full interface returned by `createLogger()` and `Rune`:

```ts
type Logger = {
  [Symbol.dispose]: () => void;
  readonly bindings: Readonly<Bindings>;
  child: (overrides?: RuneOptions) => Logger;
  readonly config: Readonly<RuneConfig>;
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
  resetLevel: () => void;
  setLevel: (level: LogLevel) => void;
  time: <T>(label: string, fn: () => T, opts?: LogType | TimeOptions) => T;
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

### RemoteTransportOptions

| Field     | Type                            | Default       | Description                             |
| --------- | ------------------------------- | ------------- | --------------------------------------- |
| `handler` | `RemoteHandler`                 | —             | Required. Receives each forwarded entry |
| `level`   | `LogLevel`                      | `'debug'`     | Minimum level to forward                |
| `env`     | `'production' \| 'development'` | auto-detected | Override the runtime environment marker |
| `onError` | `(error: unknown) => void`      | —             | Called when the handler throws          |

### JsonTransportOptions

| Field    | Type                     | Default          | Description                                                         |
| -------- | ------------------------ | ---------------- | ------------------------------------------------------------------- |
| `level`  | `LogLevel`               | `'debug'`        | Minimum level                                                       |
| `output` | `(line: string) => void` | `process.stdout` | Custom output sink                                                  |
| `safe`   | `boolean`                | `false`          | Replace circular references with `'[Circular]'` instead of throwing |

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

| Field       | Type        | Description                                     |
| ----------- | ----------- | ----------------------------------------------- |
| `rate`      | `number`    | Fraction of entries to forward (0–1). Required. |
| `transport` | `Transport` | Downstream transport. Required.                 |

### RedactTransportOptions

| Field         | Type        | Default        | Description                     |
| ------------- | ----------- | -------------- | ------------------------------- |
| `keys`        | `string[]`  | —              | Required. Field names to redact |
| `replacement` | `string`    | `'[REDACTED]'` | Replacement value               |
| `transport`   | `Transport` | —              | Required. Downstream transport  |

### TimeOptions

Options accepted by `time()` as the third argument. Can also be passed as a plain `LogType` string for brevity.

| Field   | Type      | Default   | Description                    |
| ------- | --------- | --------- | ------------------------------ |
| `level` | `LogType` | `'debug'` | Log level for the timing entry |

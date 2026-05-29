---
title: Rune — API Reference
description: API reference for @vielzeug/rune exports, logger methods, configuration types, and transport factories.
---

[[toc]]

## API At a Glance

| Symbol               | Purpose                                          | Execution mode | Common gotcha                                              |
| -------------------- | ------------------------------------------------ | -------------- | ---------------------------------------------------------- |
| `createLogger()`     | Create an isolated `Logger` instance             | Sync           | Omitting `transports` defaults to `consoleTransport()`     |
| `Rune`               | Pre-created default logger singleton             | —              | Shared instance — scope or child it before use             |
| `lazy(fn)`           | Defer a binding value past the level check       | Sync           | Factory runs on every emit, not once                       |
| `consoleTransport()` | Styled console output                            | Sync           | `group()`/`groupCollapsed()` require this transport        |
| `remoteTransport()`  | Async HTTP/webhook delivery                      | Async          | Handler errors are swallowed to `console.warn`             |
| `jsonTransport()`    | NDJSON to stdout or a custom sink                | Sync           | `process.stdout` is unavailable in browsers                |
| `batchTransport()`   | Buffered batch delivery with flush interval      | Sync/Interval  | Must call `.dispose()` on shutdown to flush remaining      |
| `sampleTransport()`  | Probabilistic entry forwarding                   | Sync           | `rate: 1` forwards all entries; `rate: 0` forwards none    |
| `redactTransport()`  | Sensitive field stripping before forwarding      | Sync           | Place this closest to the remote transport, not console    |

## Package Entry Point

| Import             | Purpose                                           |
| ------------------ | ------------------------------------------------- |
| `@vielzeug/rune`   | All exports — logger, transport factories, `lazy`, types |

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
    remoteTransport(async (type, data) => {
      await fetch('/api/logs', { body: JSON.stringify(data), method: 'POST' });
    }, { level: 'error' }),
  ],
});
```

## Rune

`Rune` is the pre-created default logger (`createLogger()` called once at module load).

Use it as a quick-start singleton. Scope it for module-level use:

```ts
import { Rune } from '@vielzeug/rune';

const log = Rune.scope('app.worker');
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

| Method                 | Returns  | What it does                                           |
| ---------------------- | -------- | ------------------------------------------------------ |
| `scope(name)`          | `Logger` | Appends `.name` to namespace; inherits everything else |
| `child(overrides?)`    | `Logger` | Clones config, applies overrides, inherits bindings    |
| `withBindings(fields)` | `Logger` | Pins fields to every subsequent call                   |

`child()` transport inheritance:

- Omit `transports` → inherit parent transports (default).
- Pass `transports: []` → disable all transports on the child.
- Pass `transports: [...]` → replace entirely with the given list.

### Utilities

| Method                      | Returns   | Description                                                            |
| --------------------------- | --------- | ---------------------------------------------------------------------- |
| `enabled(level)`            | `boolean` | True if entries at this level pass the configured threshold            |
| `time(label, fn)`           | `T`       | Measures sync/async execution; emits `debug` entry with `{ duration_ms }` in context |
| `group(label, fn)`          | `T`       | Wraps callback in `console.group`; closes even on throw/reject         |
| `groupCollapsed(label, fn)` | `T`       | Same as `group`, using `console.groupCollapsed`                        |

### Properties

| Property   | Type                   | Description                            |
| ---------- | ---------------------- | -------------------------------------- |
| `config`   | `Readonly<RuneConfig>` | Snapshot of resolved configuration     |
| `bindings` | `Readonly<Bindings>`   | Snapshot of currently pinned fields    |

## Transport Factories

### consoleTransport(options?)

```ts
consoleTransport(options?: ConsoleTransportOptions): Transport
```

Writes styled output to the browser console (CSS badges) or Node terminal (plain text). This is the default transport.

| Option      | Type       | Default    | Description             |
| ----------- | ---------- | ---------- | ----------------------- |
| `level`     | `LogLevel` | `'debug'`  | Minimum level to output |
| `timestamp` | `boolean`  | `true`     | Include `HH:MM:SS.mmm`  |
| `variant`   | `Variant`  | `'symbol'` | Badge rendering style   |

**Returns:** `Transport`

**Example:**

```ts
import { consoleTransport, createLogger } from '@vielzeug/rune';

const log = createLogger({
  transports: [consoleTransport({ level: 'info', variant: 'symbol', timestamp: true })],
});
```

### remoteTransport(handler, options?)

```ts
remoteTransport(handler: RemoteHandler, options?: RemoteTransportOptions): Transport
```

Forwards entries asynchronously to a remote handler. Fire-and-forget — handler errors are swallowed to `console.warn` and never propagate to the caller.

| Option  | Type                            | Default       | Description                             |
| ------- | ------------------------------- | ------------- | --------------------------------------- |
| `level` | `LogLevel`                      | `'debug'`     | Minimum level to forward                |
| `env`   | `'production' \| 'development'` | auto-detected | Override the runtime environment marker |

**Returns:** `Transport`

**Example:**

```ts
import { createLogger, remoteTransport } from '@vielzeug/rune';

const log = createLogger({
  transports: [
    remoteTransport(async (type, data) => {
      await fetch('/api/logs', { body: JSON.stringify(data), method: 'POST' });
    }, { level: 'error' }),
  ],
});
```

### jsonTransport(options?)

```ts
jsonTransport(options?: JsonTransportOptions): Transport
```

Outputs newline-delimited JSON (NDJSON) to `stdout` or a custom function. Useful for server-side log aggregation pipelines (ELK, Datadog, etc.).

Each line is a flat JSON object with `level`, `time` (ISO), and optional `ns`, `msg`, plus all merged context fields.

| Option   | Type                     | Default           | Description        |
| -------- | ------------------------ | ----------------- | ------------------ |
| `level`  | `LogLevel`               | `'debug'`         | Minimum level      |
| `output` | `(line: string) => void` | `process.stdout`  | Custom output sink |

**Returns:** `Transport`

**Example:**

```ts
import { createLogger, jsonTransport } from '@vielzeug/rune';

const log = createLogger({
  namespace: 'api',
  transports: [jsonTransport({ level: 'info' })],
});

log.info({ path: '/users', status: 200 }, 'request');
// {"level":"info","time":"2026-05-30T...","ns":"api","path":"/users","status":200,"msg":"request"}
```

### batchTransport(options)

```ts
batchTransport(options: BatchTransportOptions): BatchTransport
```

Buffers entries and delivers them in batches. Flushes when the buffer reaches `maxSize` or after `interval` elapses.

| Option     | Type                          | Default   | Description                           |
| ---------- | ----------------------------- | --------- | ------------------------------------- |
| `onFlush`  | `(entries: LogEntry[]) => void` | —       | Required. Receives each batch.        |
| `level`    | `LogLevel`                    | `'debug'` | Minimum level to buffer               |
| `interval` | `number`                      | `5000`    | Flush interval in milliseconds        |
| `maxSize`  | `number`                      | `50`      | Max buffer size before an early flush |

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

| Option      | Type        | Description                                    |
| ----------- | ----------- | ---------------------------------------------- |
| `rate`      | `number`    | Fraction of entries to forward (0–1)           |
| `transport` | `Transport` | Downstream transport to receive sampled entries |

**Returns:** `Transport`

**Example:**

```ts
import { createLogger, remoteTransport, sampleTransport } from '@vielzeug/rune';

const log = createLogger({
  transports: [
    sampleTransport({
      rate: 0.1,
      transport: remoteTransport(handler),
    }),
  ],
});
```

### redactTransport(options)

```ts
redactTransport(options: RedactTransportOptions): Transport
```

Strips sensitive fields from `bindings` and `context` before forwarding. Redaction is applied recursively at any depth.

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
      transport: remoteTransport(handler),
    }),
  ],
});
```

## Types

### LogType

`'debug' | 'error' | 'fatal' | 'info' | 'warn'`

### LogLevel

`LogType | 'off'` — threshold order: `debug < info < warn < error < fatal < off`

### Variant

`'icon' | 'symbol' | 'text'` — Badge rendering style for `consoleTransport`.

### Bindings

`Record<string, unknown>` — Key-value context pinned via `withBindings()` or passed per-call.

### SerializedError

| Field     | Type      | Description      |
| --------- | --------- | ---------------- |
| `message` | `string`  | Error message    |
| `name`    | `string`  | Error class name |
| `stack`   | `string?` | Stack trace      |

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
type Transport = (entry: LogEntry) => void
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

### RuneOptions

| Field        | Type                            | Default                 | Description                  |
| ------------ | ------------------------------- | ----------------------- | ---------------------------- |
| `logLevel`   | `LogLevel?`                     | `'debug'`               | Logger level threshold       |
| `namespace`  | `string?`                       | `''`                    | Namespace prefix             |
| `transports` | `Transport[]?`                  | `[consoleTransport()]`  | Transport pipeline           |
| `env`        | `'production' \| 'development'` | auto-detected           | Runtime environment override |

### RuneConfig

Resolved configuration exposed via `logger.config`:

```ts
type RuneConfig = {
  env: 'development' | 'production';
  logLevel: LogLevel;
  namespace: string;
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
  readonly bindings: Readonly<Bindings>;
  readonly config: Readonly<RuneConfig>;
  child: (overrides?: RuneOptions) => Logger;
  scope: (name: string) => Logger;
  withBindings: (bindings: Bindings) => Logger;
  enabled: (type: LogLevel) => boolean;
  time: <T>(label: string, fn: () => T) => T;
  group: <T>(label: string, fn: () => T) => T;
  groupCollapsed: <T>(label: string, fn: () => T) => T;
  debug: LogMethod;
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
  fatal: LogMethod;
};
```

### ConsoleTransportOptions

| Field       | Type       | Default    | Description             |
| ----------- | ---------- | ---------- | ----------------------- |
| `level`     | `LogLevel` | `'debug'`  | Minimum level to output |
| `timestamp` | `boolean`  | `true`     | Include `HH:MM:SS.mmm`  |
| `variant`   | `Variant`  | `'symbol'` | Badge rendering style   |

### RemoteTransportOptions

| Field   | Type                            | Default       | Description                             |
| ------- | ------------------------------- | ------------- | --------------------------------------- |
| `level` | `LogLevel`                      | `'debug'`     | Minimum level to forward                |
| `env`   | `'production' \| 'development'` | auto-detected | Override the runtime environment marker |

### JsonTransportOptions

| Field    | Type                     | Default          | Description        |
| -------- | ------------------------ | ---------------- | ------------------ |
| `level`  | `LogLevel`               | `'debug'`        | Minimum level      |
| `output` | `(line: string) => void` | `process.stdout` | Custom output sink |

### BatchTransportOptions

| Field      | Type                            | Default   | Description                           |
| ---------- | ------------------------------- | --------- | ------------------------------------- |
| `onFlush`  | `(entries: LogEntry[]) => void` | —         | Required. Receives each batch.        |
| `level`    | `LogLevel`                      | `'debug'` | Minimum level to buffer               |
| `interval` | `number`                        | `5000`    | Flush interval in milliseconds        |
| `maxSize`  | `number`                        | `50`      | Max buffer size before an early flush |

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

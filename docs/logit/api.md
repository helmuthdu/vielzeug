---
title: Logit — API Reference
description: API reference for @vielzeug/logit exports, logger methods, and configuration types.
---

[[toc]]

## API At a Glance

| Symbol           | Purpose                           | Execution mode | Common gotcha                                      |
| ---------------- | --------------------------------- | -------------- | -------------------------------------------------- |
| `createLogger()` | Create scoped logger instances    | Sync           | Set logLevel explicitly in production environments |
| `Logit.scope()`  | Create namespaced logger children | Sync           | Namespace too broad makes filtering noisy          |
| `logger.time()`  | Measure async/sync execution time | Async          | Wrap awaited operations to keep timing accurate    |

## Package Entry Point

| Import            | Purpose                                                      |
| ----------------- | ------------------------------------------------------------ |
| `@vielzeug/logit` | Main API (`createLogger`, `Logit`) and exported logger types |

## createLogger(initial?)

Creates an isolated logger instance.

Signature: `createLogger(initial?: LogitOptions | string): Logger`

- `string` shorthand sets namespace (`createLogger('api')`).
- Instances do not share mutable config.

## Logit Object

`Logit` is the pre-created default logger instance (`createLogger()` called once).

Core members:

- Logging: `debug`, `info`, `warn`, `error`, `fatal`
- Utilities: `time`, `group`, `groupCollapsed`
- Composition: `scope(name)`, `child(overrides?)`, `withBindings(bindings)`
- Context: `bindings` (readonly snapshot)
- Configuration: `config`, `enabled(level)`

Behavior notes:

- `config` returns a snapshot copy (`remote` is also copied when present).
- `bindings` returns a snapshot of pinned context fields.
- `enabled()` checks against current level threshold.
- `time()`, `group()`, and `groupCollapsed()` always call `timeEnd`/`groupEnd` even on throw/reject.
- `fatal()` routes to `console.error` and is above `error` in priority.
- Passing an `Error` as the first arg auto-serializes it into `context.err`.

## Types

### LogType

`'debug' | 'info' | 'warn' | 'error' | 'fatal'`

### LogLevel

`LogType | 'off'`

### Variant

`'text' | 'symbol' | 'icon'`

### Bindings

`Record<string, unknown>` — key-value context pinned to a logger via `withBindings()`.

### SerializedError

| Field     | Type      | Description      |
| --------- | --------- | ---------------- |
| `message` | `string`  | Error message    |
| `name`    | `string`  | Error class name |
| `stack`   | `string?` | Stack trace      |

### RemoteLogData

| Field       | Type                            | Description                        |
| ----------- | ------------------------------- | ---------------------------------- |
| `level`     | `LogType`                       | Log level                          |
| `message`   | `string?`                       | Log message                        |
| `context`   | `Bindings?`                     | Merged bindings + per-call context |
| `env`       | `'production' \| 'development'` | Runtime env marker                 |
| `namespace` | `string?`                       | Effective namespace                |
| `timestamp` | `string?`                       | ISO timestamp when enabled         |

### RemoteHandler

`(type: LogType, data: RemoteLogData) => void`

### RemoteOptions

| Field      | Type             | Description                     |
| ---------- | ---------------- | ------------------------------- |
| `handler`  | `RemoteHandler?` | Async-safe remote sink callback |
| `logLevel` | `LogLevel?`      | Remote forwarding threshold     |

### LogitOptions

| Field       | Type                    | Description                                      |
| ----------- | ----------------------- | ------------------------------------------------ |
| `logLevel`  | `LogLevel?`             | Console threshold                                |
| `variant`   | `Variant?`              | Badge style                                      |
| `timestamp` | `boolean?`              | Include timestamp                                |
| `namespace` | `string?`               | Namespace prefix                                 |
| `remote`    | `RemoteOptions \| null` | Optional remote forwarding config or explicit off |

Remote behavior notes:

- `remote` accepts `RemoteOptions` or `null`.
- `remote: undefined` preserves inherited remote settings when using `child()`.
- `remote: null` explicitly disables remote forwarding.
- `remote.logLevel` requires either `remote.handler` or an inherited handler via `child()`.

### LogitConfig

Resolved config shape exposed via `logger.config`:

```ts
type LogitConfig = {
  logLevel: LogLevel;
  namespace: string;
  timestamp: boolean;
  variant: Variant;
  remote?: {
    handler: RemoteHandler;
    logLevel: LogLevel;
  };
};
```

### Logger

Logging methods accept `(msgOrCtx?, msg?)` — three call forms:

```ts
log.info('message');
log.info({ key: 'value' }, 'message');
log.error(new Error('boom')); // context.err auto-populated
log.error(new Error('boom'), 'override');
```

Argument rules:

- String-first calls accept only one argument.
- Structured context must be the first argument.
- Error-first calls may include an optional string override message.

`Logger` methods:

- `debug(msgOrCtx?, msg?)`, `info(msgOrCtx?, msg?)`
- `warn(msgOrCtx?, msg?)`, `error(msgOrCtx?, msg?)`, `fatal(msgOrCtx?, msg?)`
- `time(label, fn)`
- `group(label, fn)`
- `groupCollapsed(label, fn)`
- `scope(name)` — namespaced child
- `child(overrides?)` — immutable config-override child, inherits bindings
- `withBindings(bindings)` — pinned-context child
- `bindings` — readonly snapshot of pinned fields
- `enabled(level)` — boolean threshold check
- `config` — readonly snapshot

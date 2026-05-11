---
title: Logit — API Reference
description: API reference for @vielzeug/logit exports, logger methods, and configuration types.
---

# Logit API Reference

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

- Logging: `debug`, `trace`, `info`, `warn`, `error`, `fatal`
- Utilities: `assert`, `table`, `time`, `group`, `groupCollapsed`
- Composition: `scope(name)`, `child(overrides?)`, `withBindings(bindings)`
- Context: `bindings` (readonly snapshot)
- Configuration: `setConfig(opts)`, `config`, `enabled(level)`

Behavior notes:

- `setConfig()` applies partial updates and returns the same logger.
- `config` returns a snapshot copy (`remote` is also copied).
- `bindings` returns a snapshot of pinned context fields.
- `enabled()` checks against current level threshold.
- `time()`, `group()`, and `groupCollapsed()` always call `timeEnd`/`groupEnd` even on throw/reject.
- `fatal()` routes to `console.error` and is above `error` in priority.
- Passing an `Error` as the first arg auto-serializes it into `context.err`.

## Types

### LogType

`'debug' | 'trace' | 'info' | 'warn' | 'error' | 'fatal'`

### LogLevel

`LogType | 'off'`

### Variant

`'text' | 'symbol' | 'icon'`

### Bindings

`Record<string, unknown>` — key-value context pinned to a logger via `withBindings()`.

### SerializedError

| Field | Type | Description |
| --- | --- | --- |
| `message` | `string` | Error message |
| `name` | `string` | Error class name |
| `stack` | `string?` | Stack trace |

### RemoteLogData

| Field | Type | Description |
| --- | --- | --- |
| `level` | `LogType` | Log level |
| `message` | `string?` | Log message |
| `context` | `Bindings?` | Merged bindings + per-call context |
| `env` | `'production' \| 'development'` | Runtime env marker |
| `namespace` | `string?` | Effective namespace |
| `timestamp` | `string?` | ISO timestamp when enabled |

### RemoteHandler

`(type: LogType, data: RemoteLogData) => void`

### RemoteOptions

| Field      | Type             | Description                     |
| ---------- | ---------------- | ------------------------------- |
| `handler`  | `RemoteHandler?` | Async-safe remote sink callback |
| `logLevel` | `LogLevel?`      | Remote forwarding threshold     |

### LogitOptions

| Field         | Type             | Description              |
| ------------- | ---------------- | ------------------------ |
| `logLevel`    | `LogLevel?`      | Console threshold        |
| `variant`     | `Variant?`       | Badge style              |
| `timestamp`   | `boolean?`       | Include timestamp        |
| `namespace`   | `string?`        | Namespace prefix         |
| `remote`      | `RemoteOptions?` | Remote forwarding config |

### LogitConfig

Resolved config shape exposed via `logger.config`:

`Omit<Required<LogitOptions>, 'remote'> & { remote: { handler?: RemoteHandler; logLevel: LogLevel } }`

### Logger

Logging methods accept `(msgOrCtx?, msg?)` — three call forms:

```ts
log.info('message')
log.info({ key: 'value' }, 'message')
log.error(new Error('boom'))           // context.err auto-populated
log.error(new Error('boom'), 'override')
```

`Logger` methods:

- `debug(msgOrCtx?, msg?)`, `trace(msgOrCtx?, msg?)`, `info(msgOrCtx?, msg?)`
- `warn(msgOrCtx?, msg?)`, `error(msgOrCtx?, msg?)`, `fatal(msgOrCtx?, msg?)`
- `assert(condition, ...args)`
- `table(data, properties?)`
- `time(label, fn)`
- `group(label, fn)`
- `groupCollapsed(label, fn)`
- `scope(name)` — namespaced child
- `child(overrides?)` — config-override child, inherits bindings
- `withBindings(bindings)` — pinned-context child
- `bindings` — readonly snapshot of pinned fields
- `setConfig(opts)` — partial update, returns logger
- `enabled(level)` — boolean threshold check
- `config` — readonly snapshot

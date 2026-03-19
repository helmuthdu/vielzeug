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

- Logging: `debug`, `trace`, `info`, `success`, `warn`, `error`
- Utilities: `assert`, `table`, `time`, `group`
- Composition: `scope(name)`, `child(overrides?)`
- Configuration: `setConfig(opts)`, `config`, `enabled(level)`

Behavior notes:

- `setConfig()` applies partial updates and returns the same logger.
- `config` returns a snapshot copy (`remote` is also copied).
- `enabled()` checks against current level threshold.
- `time()` and `group()` always call `timeEnd`/`groupEnd` even on throw/reject.

## Types

### LogType

`'debug' | 'trace' | 'info' | 'success' | 'warn' | 'error'`

### LogLevel

`LogType | 'off'`

### Variant

`'text' | 'symbol' | 'icon'`

### RemoteLogData

| Field       | Type                            | Description                |
| ----------- | ------------------------------- | -------------------------- |
| `args`      | `unknown[]`                     | Original user log args     |
| `env`       | `'production' \| 'development'` | Runtime env marker         |
| `namespace` | `string?`                       | Effective namespace        |
| `timestamp` | `string?`                       | ISO timestamp when enabled |

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
| `environment` | `boolean?`       | Include env badge        |
| `namespace`   | `string?`        | Namespace prefix         |
| `remote`      | `RemoteOptions?` | Remote forwarding config |

### LogitConfig

Resolved config shape exposed via `logger.config`:

`Omit<Required<LogitOptions>, 'remote'> & { remote: { handler?: RemoteHandler; logLevel: LogLevel } }`

### Logger

`Logger` methods:

- `debug(...args)`, `trace(...args)`, `info(...args)`, `success(...args)`, `warn(...args)`, `error(...args)`
- `assert(condition, ...args)`
- `table(data, properties?)`
- `time(label, fn)`
- `group(label, fn, collapsed?)`
- `scope(name)`
- `child(overrides?)`
- `setConfig(opts)`
- `enabled(level)`
- `config` (readonly snapshot)

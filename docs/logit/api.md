---
title: Logit — API Reference
description: Complete API reference for Logit with type signatures and parameter documentation.
---

# Logit API Reference

[[toc]]

## `Logit` object

The main export. A plain object (not a class) with all logging methods.

```ts
import { Logit } from '@vielzeug/logit';
```

### `Logit.config(options)`

Configure the global Logit instance.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `logLevel` | `LogLevel` | `'debug'` | Minimum level to log |
| `variant` | `'symbol' \| 'icon' \| 'text'` | `'symbol'` | Visual display style |
| `timestamp` | `boolean` | `true` | Show timestamp in output |
| `environment` | `boolean` | `true` | Show env indicator (🅿/🅳) |
| `namespace` | `string` | `''` | Global prefix for all logs |
| `remote` | `RemoteOptions` | `{}` | Remote logging configuration |

### `Logit.getConfig()`

Returns a read-only snapshot of the current configuration.

```ts
const config: Readonly<LogitConfig> = Logit.getConfig();
```

### Log methods

All methods accept any number of arguments.

| Method | Level | Description |
|---|---|---|
| `Logit.debug(...args)` | `debug` | Verbose debugging information |
| `Logit.trace(...args)` | `trace` | Detailed execution tracing |
| `Logit.info(...args)` | `info` | General informational messages |
| `Logit.success(...args)` | `success` | Success confirmations |
| `Logit.warn(...args)` | `warn` | Potential issues |
| `Logit.error(...args)` | `error` | Errors and failures |

### `Logit.scope(name)`

Creates an isolated scoped logger with the given namespace. Does not mutate global state.

| Parameter | Type | Description |
|---|---|---|
| `name` | `string` | Namespace for this logger |

**Returns:** `ScopedLogger`

```ts
const api = Logit.scope('api');
api.info('msg'); // [api] msg
```

### `Logit.assert(condition, message, context?)`

Logs an error via `console.assert` if `condition` is `false`.

| Parameter | Type | Description |
|---|---|---|
| `condition` | `boolean` | Assertion condition |
| `message` | `string` | Message shown on failure |
| `context` | `Record<string, unknown>` | Optional extra context |

### `Logit.table(data, properties?)`

Renders data as a console table.

| Parameter | Type | Description |
|---|---|---|
| `data` | `unknown` | Data to display in table |
| `properties` | `string[]` | Optional column filter |

### `Logit.time(label)`

Starts a console timer. Gated by the `time` log level (priority 2).

| Parameter | Type | Description |
|---|---|---|
| `label` | `string` | Timer identifier |

### `Logit.timeEnd(label)`

Stops and logs a console timer.

| Parameter | Type | Description |
|---|---|---|
| `label` | `string` | Timer identifier (must match `time()` call) |

### `Logit.groupCollapsed(label?, text?)`

Opens a collapsed console group. Gated by the `success` log level.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'GROUP'` | Group header label |
| `text` | `string` | `''` | Optional secondary text |

### `Logit.groupEnd()`

Closes the current console group.

### `Logit.toggleTimestamp(value?)`

Toggles or explicitly sets timestamp visibility.

| Parameter | Type | Description |
|---|---|---|
| `value` | `boolean \| undefined` | If omitted, flips current value |

### `Logit.toggleEnvironment(value?)`

Toggles or explicitly sets environment indicator visibility.

| Parameter | Type | Description |
|---|---|---|
| `value` | `boolean \| undefined` | If omitted, flips current value |

---

## Types

### `LogLevel`

```ts
type LogLevel = 'debug' | 'trace' | 'time' | 'table' | 'info' | 'success' | 'warn' | 'error' | 'off';
```

### `LogType`

```ts
type LogType = Exclude<LogLevel, 'off'>;
```

### `Variant`

```ts
type Variant = 'text' | 'symbol' | 'icon';
```

### `LogitOptions`

```ts
type LogitOptions = {
  environment?: boolean;
  variant?: Variant;
  logLevel?: LogLevel;
  namespace?: string;
  remote?: RemoteOptions;
  timestamp?: boolean;
};
```

### `LogitConfig`

```ts
type LogitConfig = Required<Omit<LogitOptions, 'remote'>> & { remote: RemoteOptions };
```

### `RemoteOptions`

```ts
type RemoteOptions = {
  handler?: (type: LogType, data: RemoteLogData) => void;
  logLevel?: LogLevel;
};
```

### `RemoteLogData`

```ts
type RemoteLogData = {
  args: unknown[];
  environment: 'production' | 'development';
  namespace?: string;
  timestamp?: string;
};
```

### `ScopedLogger`

```ts
type ScopedLogger = {
  debug: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  scope: (name: string) => ScopedLogger;
  success: (...args: unknown[]) => void;
  trace: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};
```

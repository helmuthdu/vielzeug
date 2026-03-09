---
title: Logit — API Reference
description: Complete API reference for Logit with type signatures and parameter documentation.
---

# Logit API Reference

[[toc]]

## `createLogger(initial?)`

Creates and returns an independent `Logger` instance with its own isolated config. Each call is fully independent — config changes never bleed between instances.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `initial` | `LogitOptions \| string` | `{}` | Initial options, or a string shorthand that sets `namespace` |

**Returns:** `Logger`

```ts
import { createLogger } from '@vielzeug/logit';

const log = createLogger({ logLevel: 'warn', namespace: 'App' });
const api = createLogger('api'); // shorthand for createLogger({ namespace: 'api' })
```



## `Logit` object

The pre-created default `Logger` instance. Equivalent to calling `createLogger()` with no arguments.

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

### `Logit.enabled(type)`

Returns `true` if the given level passes the current `logLevel` filter. Useful to guard against computing expensive arguments.

| Parameter | Type | Description |
|---|---|
| `type` | `LogLevel` | The level to query |

**Returns:** `boolean`

```ts
if (Logit.enabled('debug')) {
  Logit.debug('Expensive info', computeExpensiveInfo());
}
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

Creates an isolated child logger with the namespace appended (dot-separated). Does not mutate the parent.

| Parameter | Type | Description |
|---|---|---|
| `name` | `string` | Namespace segment to append |

**Returns:** `Logger`

```ts
const api = Logit.scope('api');       // [api] prefix
api.info('msg');
const auth = api.scope('auth');       // [api.auth] prefix
```

### `Logit.child(overrides?)`

Creates an independent `Logger` starting from a snapshot of the current config. Accepts any config overrides, not just namespace.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `overrides` | `LogitOptions` | `{}` | Options to merge over the parent snapshot |

**Returns:** `Logger`

```ts
const child = Logit.child({ logLevel: 'debug', namespace: 'verbose' });
// parent config is unchanged
```

### `Logit.assert(condition, ...args)`

Forwards to `console.assert`. Only fires when the logger's level is at or above `error`.

| Parameter | Type | Description |
|---|---|---|
| `condition` | `boolean` | Assertion condition |
| `...args` | `unknown[]` | Any additional arguments forwarded to `console.assert` |

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

### `Logit.group(label?, text?)`

Opens a console group. Gated by the `debug` log level.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'GROUP'` | Group header label |
| `text` | `string` | `''` | Optional secondary text |

### `Logit.groupCollapsed(label?, text?)`

Opens a collapsed console group. Gated by the `debug` log level.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'GROUP'` | Group header label |
| `text` | `string` | `''` | Optional secondary text |

### `Logit.groupEnd()`

Closes the current console group.

---

## Types

### `LogLevel`

```ts
type LogLevel = 'debug' | 'trace' | 'time' | 'table' | 'info' | 'success' | 'warn' | 'error' | 'off';
```

### `LogType`

```ts
type LogType = 'debug' | 'trace' | 'info' | 'success' | 'warn' | 'error';
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
type LogitConfig = Omit<Required<LogitOptions>, 'remote'> & { remote: ResolvedRemote };
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

### `Logger`

The full type returned by `createLogger()`, `scope()`, and `child()`.

```ts
type Logger = {
  assert: (condition: boolean, ...args: unknown[]) => void;
  child: (overrides?: LogitOptions) => Logger;
  config: (opts: LogitOptions) => Logger;
  debug: (...args: unknown[]) => void;
  enabled: (type: LogLevel) => boolean;
  error: (...args: unknown[]) => void;
  getConfig: () => Readonly<LogitConfig>;
  group: (label?: string, text?: string) => void;
  groupCollapsed: (label?: string, text?: string) => void;
  groupEnd: () => void;
  info: (...args: unknown[]) => void;
  scope: (name: string) => Logger;
  success: (...args: unknown[]) => void;
  table: (data: unknown, properties?: string[]) => void;
  time: (label: string) => void;
  timeEnd: (label: string) => void;
  trace: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};
```

### `ResolvedRemote`

The fully resolved remote config stored internally (all fields present).

```ts
type ResolvedRemote = { handler?: RemoteHandler; logLevel: LogLevel };
```

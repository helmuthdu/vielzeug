---
title: Logit — API Reference
description: Complete API reference for Logit with type signatures and parameter documentation.
---

## Logit API Reference

[[toc]]

## `createLogger(initial?)`

Creates and returns an independent `Logger` instance with its own isolated config. Each call is fully independent — config changes never bleed between instances.

| Parameter | Type                     | Default | Description                                                  |
| --------- | ------------------------ | ------- | ------------------------------------------------------------ |
| `initial` | `LogitOptions \| string` | `{}`    | Initial options, or a string shorthand that sets `namespace` |

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

### `Logit.setConfig(options)`

Partially updates the logger's configuration. Unset fields keep their current value. Returns the logger for fluent chaining.

| Parameter     | Type                           | Default    | Description                  |
| ------------- | ------------------------------ | ---------- | ---------------------------- |
| `logLevel`    | `LogLevel`                     | `'debug'`  | Minimum level to log         |
| `variant`     | `'symbol' \| 'icon' \| 'text'` | `'symbol'` | Visual display style         |
| `timestamp`   | `boolean`                      | `true`     | Show timestamp in output     |
| `environment` | `boolean`                      | `true`     | Show env indicator (🅿/🅳)    |
| `namespace`   | `string`                       | `''`       | Global prefix for all logs   |
| `remote`      | `RemoteOptions`                | `{}`       | Remote logging configuration |

**Returns:** `Logger`

```ts
Logit.setConfig({ logLevel: 'warn', timestamp: false });

// Fluent chaining — setConfig returns the logger
Logit.setConfig({ logLevel: 'error' }).error('already configured');
```

### `Logit.config`

Read-only getter. Returns a frozen snapshot of the current configuration. Mutating the returned object has no effect.

**Returns:** `Readonly<LogitConfig>`

```ts
const cfg = Logit.config;
console.log(cfg.logLevel); // 'warn'
```

### `Logit.enabled(type)`

Returns `true` if the given level passes the current `logLevel` filter. Useful to guard against computing expensive arguments.

| Parameter | Type       | Description        |
| --------- | ---------- | ------------------ |
| `type`    | `LogLevel` | The level to query |

**Returns:** `boolean`

```ts
if (Logit.enabled('debug')) {
  Logit.debug('Expensive info', computeExpensiveInfo());
}
```

### Log methods

All methods accept any number of arguments.

| Method                   | Level     | Description                    |
| ------------------------ | --------- | ------------------------------ |
| `Logit.debug(...args)`   | `debug`   | Verbose debugging information  |
| `Logit.trace(...args)`   | `trace`   | Detailed execution tracing     |
| `Logit.info(...args)`    | `info`    | General informational messages |
| `Logit.success(...args)` | `success` | Success confirmations          |
| `Logit.warn(...args)`    | `warn`    | Potential issues               |
| `Logit.error(...args)`   | `error`   | Errors and failures            |

### `Logit.scope(name)`

Creates an isolated child logger with the namespace appended (dot-separated). Does not mutate the parent.

| Parameter | Type     | Description                 |
| --------- | -------- | --------------------------- |
| `name`    | `string` | Namespace segment to append |

**Returns:** `Logger`

```ts
const api = Logit.scope('api'); // [api] prefix
api.info('msg');
const auth = api.scope('auth'); // [api.auth] prefix
```

### `Logit.child(overrides?)`

Creates an independent `Logger` starting from a snapshot of the current config. Accepts any config overrides, not just namespace.

| Parameter   | Type           | Default | Description                               |
| ----------- | -------------- | ------- | ----------------------------------------- |
| `overrides` | `LogitOptions` | `{}`    | Options to merge over the parent snapshot |

**Returns:** `Logger`

```ts
const child = Logit.child({ logLevel: 'debug', namespace: 'verbose' });
// parent config is unchanged
```

### `Logit.assert(condition, ...args)`

Forwards to `console.assert`. Only fires when the logger's `logLevel` is not `'off'`.

| Parameter   | Type        | Description                                            |
| ----------- | ----------- | ------------------------------------------------------ |
| `condition` | `boolean`   | Assertion condition                                    |
| `...args`   | `unknown[]` | Any additional arguments forwarded to `console.assert` |

### `Logit.table(data, properties?)`

Renders data as a console table. Gated by the `debug` log level.

| Parameter    | Type       | Description              |
| ------------ | ---------- | ------------------------ |
| `data`       | `unknown`  | Data to display in table |
| `properties` | `string[]` | Optional column filter   |

### `Logit.time<T>(label, fn)`

Wraps `fn` in `console.time` / `console.timeEnd`. Returns the value produced by `fn`. Supports async functions — `timeEnd` is called after the promise settles (resolve or reject). Gated by the `debug` log level; when suppressed, `fn` still runs and its return value passes through unchanged.

When the logger has a `namespace`, the timer label is prefixed as `[namespace] label` to avoid timer collisions between scoped loggers.

| Parameter | Type      | Description                          |
| --------- | --------- | ------------------------------------ |
| `label`   | `string`  | Timer identifier                     |
| `fn`      | `() => T` | The function to time (sync or async) |

**Returns:** `T`

```ts
// Sync
const rows = log.time('db-query', () => db.querySync());

// Async
const data = await log.time('fetch', () => fetch('/api').then(r => r.json()));
```

### `Logit.group<T>(label, fn, collapsed?)`

Wraps `fn` in `console.group` / `console.groupEnd`. Returns the value produced by `fn`. Supports async functions — `groupEnd` is called after the promise settles (resolve or reject). Gated by the `debug` log level; when suppressed, `fn` still runs and its return value passes through unchanged.

| Parameter   | Type      | Default | Description                              |
| ----------- | --------- | ------- | ---------------------------------------- |
| `label`     | `string`  |         | Group header label                       |
| `fn`        | `() => T` |         | The function to run inside the group     |
| `collapsed` | `boolean` | `false` | Use `console.groupCollapsed` when `true` |

**Returns:** `T`

```ts
// Expanded group with async function
const order = await Logit.group('Checkout', async () => {
  Logit.info('Validating cart');
  return processOrder(cart);
});

// Collapsed group
Logit.group('debug details', () => Logit.debug(payload), true);
```

## Types

### `LogType`

The set of loggable levels (excludes `'off'`).

```ts
type LogType = 'debug' | 'trace' | 'info' | 'success' | 'warn' | 'error';
```

### `LogLevel`

```ts
type LogLevel = LogType | 'off';
```

### `Variant`

```ts
type Variant = 'text' | 'symbol' | 'icon';
```

### `LogitOptions`

```ts
type LogitOptions = {
  environment?: boolean;
  logLevel?: LogLevel;
  namespace?: string;
  remote?: RemoteOptions;
  timestamp?: boolean;
  variant?: Variant;
};
```

### `LogitConfig`

The fully resolved configuration (all fields present). Returned by `logger.config`.

```ts
type LogitConfig = Omit<Required<LogitOptions>, 'remote'> & { remote: ResolvedRemote };
```

### `RemoteOptions`

```ts
type RemoteOptions = {
  handler?: RemoteHandler;
  logLevel?: LogLevel;
};
```

### `RemoteHandler`

```ts
type RemoteHandler = (type: LogType, data: RemoteLogData) => void;
```

### `RemoteLogData`

```ts
type RemoteLogData = {
  args: unknown[];
  env: 'production' | 'development';
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
  readonly config: Readonly<LogitConfig>;
  setConfig: (opts: LogitOptions) => Logger;
  debug: (...args: unknown[]) => void;
  enabled: (type: LogLevel) => boolean;
  error: (...args: unknown[]) => void;
  group: <T>(label: string, fn: () => T, collapsed?: boolean) => T;
  info: (...args: unknown[]) => void;
  scope: (name: string) => Logger;
  success: (...args: unknown[]) => void;
  table: (data: unknown, properties?: string[]) => void;
  time: <T>(label: string, fn: () => T) => T;
  trace: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};
```

### `ResolvedRemote`

The fully resolved remote config stored internally (all fields present).

```ts
type ResolvedRemote = { handler?: RemoteHandler; logLevel: LogLevel };
```


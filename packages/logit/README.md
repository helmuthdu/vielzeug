# @vielzeug/logit

> Zero-dependency logging with log levels, scoped loggers, styled output, and optional remote transport

[![npm version](https://img.shields.io/npm/v/@vielzeug/logit)](https://www.npmjs.com/package/@vielzeug/logit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Logit** is a developer-friendly logger that works in both browser and Node.js. It adds colour, log-level filtering, timestamps, and scoped namespaces on top of the native console — with a non-blocking async remote handler for production error reporting.

## Installation

```sh
pnpm add @vielzeug/logit
# npm install @vielzeug/logit
# yarn add @vielzeug/logit
```

## Quick Start

```typescript
import { createLogger, Logit } from '@vielzeug/logit';

// Log at different levels
Logit.debug('Debugging info', { userId: '123' });
Logit.info('Server started', { port: 3000 });
Logit.success('User created');
Logit.warn('Memory usage high', { usage: '85%' });
Logit.error('Connection failed', new Error('Timeout'));

// Scoped loggers — namespaced, isolated from the parent
const api = Logit.scope('api');
api.info('GET /users');              // [api] GET /users
api.scope('auth').info('login');     // [api.auth] login

// Isolated instance with its own config
const log = createLogger({ namespace: 'Worker', logLevel: 'warn' });

// Callback-style timer — timeEnd fires automatically (sync or async)
const rows = await log.time('db-query', () => db.find(id));

// Callback-style group — groupEnd fires automatically, even on throw/reject
const order = await log.group('Checkout', async () => {
  log.info('validating cart');
  return processOrder(cart);
});

// setConfig returns the logger for fluent chaining
Logit.setConfig({ logLevel: 'warn', variant: 'symbol', timestamp: true });
```

## Features

- ✅ **Log levels** — `debug`, `trace`, `info`, `success`, `warn`, `error`; filter with `setConfig({ logLevel })`
- ✅ **Level query** — `enabled(type)` to guard against computing expensive arguments
- ✅ **Scoped loggers** — `scope(name)` and `child(overrides?)` return isolated instances that never mutate the parent
- ✅ **Styled output** — browser CSS badges; `symbol`, `icon`, or `text` variants
- ✅ **Remote logging** — non-blocking async handler; respects its own `logLevel` threshold
- ✅ **Callback timer** — `time<T>(label, fn)` wraps `console.time/timeEnd`, returns `T`, fires `timeEnd` on throw/reject too
- ✅ **Callback group** — `group<T>(label, fn, collapsed?)` wraps `console.group/groupEnd`, returns `T`, fires `groupEnd` on throw/reject too
- ✅ **Assertions** — `assert(condition, ...args)` forwards to `console.assert`
- ✅ **Tables** — `table(data, properties?)` forwards to `console.table`
- ✅ **Zero dependencies**

## Usage

### Log levels

```typescript
import { Logit } from '@vielzeug/logit';

Logit.debug('Verbose info', { detail: 'value' });
Logit.trace('Deep trace');
Logit.info('User logged in', { userId: '123' });
Logit.success('Order placed');
Logit.warn('Rate limit approaching', { remaining: 10 });
Logit.error('Payment failed', new Error('Card declined'));
```

### Configuration

```typescript
Logit.setConfig({
  logLevel: 'warn',    // 'debug' | 'trace' | 'info' | 'success' | 'warn' | 'error' | 'off'
  variant: 'symbol',   // 'symbol' | 'icon' | 'text'
  timestamp: true,     // include HH:MM:SS.mmm
  environment: true,   // 🅿 (prod) / 🅳 (dev) badge
  namespace: 'MyApp',
  remote: {
    logLevel: 'error', // only send errors remotely
    handler: (type, data) => sendToSentry(type, data),
  },
});

// Read current config — getter, returns a frozen snapshot
const cfg = Logit.config;
```

### Scoped and child loggers

```typescript
const api = Logit.scope('api');        // [api] prefix
const auth = api.scope('auth');        // [api.auth] prefix

// child() — fully independent copy of the config, with optional overrides
const verbose = Logit.child({ logLevel: 'debug', namespace: 'verbose' });
```

### Timer

```typescript
// Sync — timeEnd fires automatically, value is returned
const rows = log.time('db-query', () => db.querySync());

// Async — timeEnd fires after the promise settles (resolve or reject)
const data = await log.time('fetch', () => fetch('/api').then(r => r.json()));
```

### Group

```typescript
// groupEnd fires automatically after fn returns (or throws, or rejects)
const order = await log.group('Checkout', async () => {
  log.info('validating cart');
  const result = await processOrder(cart);
  log.success('order created', result.id);
  return result;
});

// Collapsed by default in DevTools
log.group('debug details', () => log.debug(payload), true);
```

### Remote logging

```typescript
Logit.setConfig({
  remote: {
    logLevel: 'error',
    handler: async (type, data) => {
      // data: { args, env, namespace?, timestamp? }
      await fetch('/api/logs', {
        method: 'POST',
        body: JSON.stringify({ level: type, ...data }),
      });
    },
  },
});
```

## API

| Export | Description |
|---|---|
| `createLogger(initial?)` | Create an isolated `Logger` instance |
| `Logit` | Pre-created default `Logger` instance |

**Logger methods**

| Method | Description |
|---|---|
| `debug / trace / info / success / warn / error(...args)` | Log at the given level |
| `setConfig(opts)` | Partially update config; returns `this` for chaining |
| `config` | Getter — returns a frozen config snapshot |
| `enabled(level)` | Returns `true` if `level` passes the current filter |
| `scope(name)` | Create a child logger with the namespace appended |
| `child(overrides?)` | Create an independent copy with optional overrides |
| `time<T>(label, fn)` | Wrap `fn` in `console.time/timeEnd`; returns `T` |
| `group<T>(label, fn, collapsed?)` | Wrap `fn` in `console.group/groupEnd`; returns `T` |
| `assert(condition, ...args)` | Forward to `console.assert` |
| `table(data, properties?)` | Forward to `console.table` |

### Config Options

| Option | Type | Default | Description |
|---|---|---|---|
| `logLevel` | `LogLevel` | `'debug'` | Minimum level to output |
| `variant` | `'symbol' \| 'icon' \| 'text'` | `'symbol'` | Badge display style |
| `namespace` | `string` | `''` | Prefix applied to all logs |
| `timestamp` | `boolean` | `true` | Include `HH:MM:SS.mmm` timestamp |
| `environment` | `boolean` | `true` | Show 🅿/🅳 env indicator |
| `remote.handler` | `RemoteHandler` | — | Async remote log function |
| `remote.logLevel` | `LogLevel` | `'debug'` | Minimum level to send remotely |

## Documentation

Full docs at **[vielzeug.dev/logit](https://vielzeug.dev/logit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/logit/usage) | Configuration, scoped loggers, timers, groups, remote logging |
| [API Reference](https://vielzeug.dev/logit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/logit/examples) | Real-world logging patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.

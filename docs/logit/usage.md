---
title: Logit — Usage Guide
description: Configuration, scoped loggers, remote logging, and best practices for Logit.
---

# Logit Usage Guide

::: tip New to Logit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Why Logit?

Plain `console.log` lacks structure: no log levels, no namespacing, no remote delivery, no way to silence logs in production.

```ts
// Before — manual approach
if (process.env.NODE_ENV !== 'production') {
  console.log('[api] GET /users', data);
}
fetch('/api/logs', { method: 'POST', body: JSON.stringify({ level: 'error', msg }) });

// After — Logit
import { Logit } from '@vielzeug/logit';
const api = Logit.scope('api');
api.info('GET /users', data);  // filtered by log level, styled, optionally remote
```

| Feature | Logit | Winston | Pino | console |
|---|---|---|---|---|
| Bundle size | <PackageInfo package="logit" type="size" /> | ~44 kB | ~4 kB | 0 kB |
| Browser support | ✅ | ❌ | ❌ | ✅ |
| Scoped loggers | ✅ | Manual | Child | ❌ |
| Remote logging | ✅ Built-in | ✅ Transports | ✅ Streams | ❌ |
| Styled output | ✅ CSS badges | Text only | Text only | Manual |
| Zero dependencies | ✅ | ❌ (15+) | ❌ (5+) | N/A |

**Use Logit when** you need isomorphic logging (browser + Node.js), namespaced module loggers, or remote error delivery without a heavy dependency chain.

**Consider alternatives when** you need high-throughput file-based logging (Pino), file rotation (Winston), or your team already uses a logging framework.

## Configuration

### `Logit.config(options)`

Configure Logit globally. Call once at app startup.

```ts
Logit.config({
  logLevel: 'warn',      // 'debug' | 'trace' | 'info' | 'success' | 'warn' | 'error' | 'off'
  variant: 'symbol',     // 'symbol' | 'icon' | 'text'
  timestamp: true,       // show HH:MM:SS.mmm
  environment: true,     // show 🅿 (prod) / 🅳 (dev) indicator
  namespace: 'MyApp',    // prefix all global logs

  // Remote logging
  remote: {
    logLevel: 'error',   // only send errors remotely
    handler: (type, data) => {
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: type,
          timestamp: data.timestamp,
          namespace: data.namespace,
          environment: data.environment,
          args: data.args,
        }),
      });
    },
  },
});
```

### Read current config

```ts
const config = Logit.getConfig();
console.log(config.logLevel); // 'warn'
```

### Log level hierarchy

Levels are ordered from lowest to highest priority. Setting a level silences everything below it.

| Level | Priority | Methods |
|---|---|---|
| `debug` | 0 | `Logit.debug()` |
| `trace` | 1 | `Logit.trace()` |
| `info` | 4 | `Logit.info()` |
| `success` | 5 | `Logit.success()` |
| `warn` | 6 | `Logit.warn()` |
| `error` | 7 | `Logit.error()` |
| `off` | 8 | _(silences all)_ |

Note: `time` (priority 2) and `table` (priority 3) are internal levels used to gate `time/timeEnd` and `table` calls.

### Display variants

```ts
Logit.config({ variant: 'symbol' }); // 🅳 🅸 🆂 🆆 🅴
Logit.config({ variant: 'icon' });   // ☕ ℹ ✔ ⚠ ✘
Logit.config({ variant: 'text' });   // DEBUG INFO SUCCESS WARN ERROR
```

## Logging Methods

### Basic levels

```ts
Logit.debug('Verbose info', { detail: 'value' });
Logit.trace('Deep trace');
Logit.info('User logged in', { userId: '123' });
Logit.success('Order placed');
Logit.warn('Rate limit approaching', { remaining: 10 });
Logit.error('Payment failed', new Error('Card declined'));
```

All methods accept any number of arguments — objects, errors, and primitives are all supported.

### Assertions

Logs an error if `condition` is `false`:

```ts
Logit.assert(user !== null, 'User must be defined', { userId });
Logit.assert(response.ok, 'HTTP request failed', { status: response.status });
```

### Tables

```ts
const users = [
  { name: 'Alice', role: 'admin' },
  { name: 'Bob', role: 'editor' },
];
Logit.table(users);
Logit.table(users, ['name']); // Show only the "name" column
```

### Timing

```ts
Logit.time('db-query');
const result = await db.query('SELECT * FROM users');
Logit.timeEnd('db-query'); // db-query: 45ms
```

### Groups

```ts
Logit.groupCollapsed('Request Details', 'GET /users');
Logit.info('Headers:', req.headers);
Logit.info('Query:', req.query);
Logit.groupEnd();
```

## Scoped Loggers

`Logit.scope(name)` returns a `ScopedLogger` with the same log methods. Scoped loggers **do not mutate global state**.

```ts
const api = Logit.scope('api');
api.info('Started');     // [api] Started
api.warn('Slow query'); // [api] Slow query

// Nest scopes via the scoped logger's own .scope()
const auth = api.scope('auth');
auth.info('Login');     // [api.auth] Login
```

Scoped loggers support: `debug`, `trace`, `info`, `success`, `warn`, `error`, and `.scope()`.

```ts
// Pass scoped loggers to modules
function createUserService(logger = Logit.scope('user-service')) {
  return {
    create: async (data) => {
      logger.info('Creating user', data);
      // ...
    },
  };
}
```

## Remote Logging

Configure a remote handler to ship logs to external services. The handler is called asynchronously (non-blocking).

```ts
Logit.config({
  remote: {
    logLevel: 'error',   // only errors are sent remotely
    handler: (type, data) => {
      // type: 'debug' | 'trace' | 'info' | 'success' | 'warn' | 'error' | 'time' | 'table'
      // data: { args, environment, namespace?, timestamp? }

      if (type === 'error') {
        myErrorTracker.captureException(data.args[0], {
          extra: {
            level: type,
            namespace: data.namespace,
            environment: data.environment,
          },
        });
      }
    },
  },
});
```

### Send to multiple destinations

```ts
Logit.config({
  remote: {
    logLevel: 'warn',
    handler: async (type, data) => {
      await Promise.all([
        sentry.log(type, data),
        datadog.log(type, data),
      ]);
    },
  },
});
```

## Environment-aware setup

```ts
const isProd = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';

Logit.config({
  logLevel: isProd ? 'warn' : 'debug',
  timestamp: true,
  environment: true,
  remote: isProd
    ? {
        logLevel: 'error',
        handler: (type, data) => sendToSentry(type, data),
      }
    : {},
});
```

### Toggle indicators at runtime

```ts
Logit.toggleTimestamp();           // flip current value
Logit.toggleTimestamp(false);      // explicitly hide
Logit.toggleEnvironment(true);     // explicitly show
```

## Testing

Logit doesn't expose a mock API — use `config()` to silence output during tests and restore it after.

```ts
import { Logit } from '@vielzeug/logit';

beforeAll(() => Logit.config({ logLevel: 'off' }));
afterAll(() => Logit.config({ logLevel: 'debug' }));

it('logs info on startup', () => {
  // Logit.info() routes to console.info
  const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
  Logit.config({ logLevel: 'debug' });

  Logit.info('startup');

  expect(spy).toHaveBeenCalled();
  spy.mockRestore();
});
```

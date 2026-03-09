---
title: Logit — Usage Guide
description: Configuration, scoped loggers, timers, groups, remote logging, and best practices for Logit.
---

## Logit Usage Guide

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
api.info('GET /users', data); // filtered by log level, styled, optionally remote
```

| Feature           | Logit                                       | Winston       | Pino       | console |
| ----------------- | ------------------------------------------- | ------------- | ---------- | ------- |
| Bundle size       | <PackageInfo package="logit" type="size" /> | ~44 kB        | ~4 kB      | 0 kB    |
| Browser support   | ✅                                          | ❌            | ❌         | ✅      |
| Scoped loggers    | ✅                                          | Manual        | Child      | ❌      |
| Remote logging    | ✅ Built-in                                 | ✅ Transports | ✅ Streams | ❌      |
| Styled output     | ✅ CSS badges                               | Text only     | Text only  | Manual  |
| Zero dependencies | ✅                                          | ❌ (15+)      | ❌ (5+)    | N/A     |

**Use Logit when** you need isomorphic logging (browser + Node.js), namespaced module loggers, or remote error delivery without a heavy dependency chain.

**Consider alternatives when** you need high-throughput file-based logging (Pino), file rotation (Winston), or your team already uses a logging framework.

## Import

```ts
import { Logit, createLogger } from '@vielzeug/logit';

// Types only
import type { Logger, LogLevel, LogType, LogitOptions, LogitConfig, RemoteHandler, RemoteOptions, RemoteLogData } from '@vielzeug/logit';
```

`Logit` is the pre-created default logger instance. Use `createLogger()` for module-scoped or isolated instances.

## Logger instances

### `createLogger(initial?)`

For module-level or test isolation, use `createLogger()` to get an independent logger with its own private config:

```ts
import { createLogger } from '@vielzeug/logit';

const log = createLogger({ namespace: 'App', logLevel: 'info' });
const api = createLogger('api'); // string shorthand sets namespace
```

Each call returns a new `Logger` — config changes to one never affect another. `Logit` is simply the pre-created default instance (`createLogger()` with no arguments).

## Configuration

### `logger.setConfig(options)`

Configure a logger. Call once at app startup, or chain calls fluently.

```ts
Logit.setConfig({
  logLevel: 'warn', // 'debug' | 'trace' | 'info' | 'success' | 'warn' | 'error' | 'off'
  variant: 'symbol', // 'symbol' | 'icon' | 'text'
  timestamp: true, // show HH:MM:SS.mmm
  environment: true, // show 🅿 (prod) / 🅳 (dev) indicator
  namespace: 'MyApp', // prefix all global logs

  // Remote logging
  remote: {
    logLevel: 'error', // only send errors (default is 'debug' — matches all)
    handler: (type, data) => {
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: type,
          timestamp: data.timestamp,
          namespace: data.namespace,
          env: data.env,
          args: data.args,
        }),
      });
    },
  },
});
```

`setConfig` applies partial updates — unspecified fields keep their current value. It returns the logger for fluent chaining:

```ts
Logit.setConfig({ logLevel: 'error' }).error('already configured');
```

### Read current config

`config` is a getter that returns a frozen snapshot of the current configuration. Mutating the returned object has no effect:

```ts
const cfg = Logit.config;
console.log(cfg.logLevel); // 'warn'
```

### Log level hierarchy

Levels are ordered from lowest to highest priority. Setting a level silences everything below it.

| Level     | Priority | Methods           |
| --------- | -------- | ----------------- |
| `debug`   | 0        | `Logit.debug()`   |
| `trace`   | 1        | `Logit.trace()`   |
| `info`    | 2        | `Logit.info()`    |
| `success` | 3        | `Logit.success()` |
| `warn`    | 4        | `Logit.warn()`    |
| `error`   | 5        | `Logit.error()`   |
| `off`     | 6        | _(silences all)_  |

### Display variants

```ts
Logit.setConfig({ variant: 'symbol' }); // 🅳 🅸 🆂 🆆 🅴
Logit.setConfig({ variant: 'icon' });   // ☕ ℹ ✔ ⚠ ✘
Logit.setConfig({ variant: 'text' });   // DEBUG INFO SUCCESS WARN ERROR
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

### Level check

`enabled(type)` returns `true` if the given level passes the current `logLevel` filter — use it to guard against computing expensive arguments:

```ts
if (Logit.enabled('debug')) {
  Logit.debug('Diagnostics', buildDiagnostics());
}
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

`time<T>(label, fn)` wraps `fn` in `console.time` / `console.timeEnd`. It returns the value produced by `fn`, works with both sync and async functions, and guarantees `timeEnd` fires even if `fn` throws or rejects.

```ts
// Sync — returns the value directly
const rows = log.time('db-query', () => db.querySync());

// Async — timeEnd fires after the promise settles
const data = await log.time('fetch', () => fetch('/api').then(r => r.json()));

// Namespace-prefixed label — avoids collisions across scoped loggers
const api = createLogger({ namespace: 'api' });
api.time('query', () => {}); // timer label becomes "[api] query"
```

When the logger's `logLevel` suppresses the timer, `fn` still runs and its return value is passed through unchanged.

### Groups

`group<T>(label, fn, collapsed?)` wraps `fn` in `console.group` / `console.groupEnd`. It returns the value produced by `fn`, supports async functions, and guarantees `groupEnd` fires even if `fn` throws or rejects.

```ts
// Expanded group (default)
const order = await Logit.group('Checkout', async () => {
  Logit.info('Validating cart');
  const result = await processOrder(cart);
  Logit.success('Order created', result.id);
  return result;
});

// Collapsed group — appears closed in DevTools until clicked
Logit.group('Debug payload', () => {
  Logit.debug('raw', payload);
}, true);
```

When the logger's `logLevel` suppresses the group, `fn` still runs and its return value is passed through unchanged.

## Scoped Loggers

`logger.scope(name)` returns an independent `Logger` with the namespace appended (dot-separated). It does **not** mutate the parent.

```ts
const api = Logit.scope('api');
api.info('Started'); // [api] Started
api.warn('Slow query'); // [api] Slow query

// Nest scopes via the returned logger's own .scope()
const auth = api.scope('auth');
auth.info('Login'); // [api.auth] Login
```

The namespace is baked in at `scope()` call time — later changes to the parent do not affect an already-created scope.

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

## Child Loggers

`logger.child(overrides?)` creates an independent logger starting from a snapshot of the parent's current config. Unlike `scope()`, it accepts any config overrides.

```ts
const parent = createLogger({ logLevel: 'info', namespace: 'App' });

// Override specific options; all others are inherited
const verbose = parent.child({ logLevel: 'debug' });

// Changes to parent do not affect child
parent.setConfig({ logLevel: 'error' });
verbose.config.logLevel; // still 'debug'
```

Remote config is merged rather than replaced:

```ts
const child = parent.child({ remote: { logLevel: 'debug' } });
// child inherits parent's remote handler, overrides the remote threshold
```

## Remote Logging

Configure a remote handler to ship logs to external services. The handler is called asynchronously (non-blocking) and any errors it throws are silently swallowed — remote failures never affect the caller.

```ts
Logit.setConfig({
  remote: {
    logLevel: 'error', // only errors are sent remotely
    handler: (type, data) => {
      // type: LogType — 'debug' | 'trace' | 'info' | 'success' | 'warn' | 'error'
      // data: { args, env, namespace?, timestamp? }

      if (type === 'error') {
        myErrorTracker.captureException(data.args[0], {
          extra: {
            level: type,
            namespace: data.namespace,
            env: data.env,
          },
        });
      }
    },
  },
});
```

If you only provide a `handler` without an explicit `logLevel`, the default `'debug'` level is used — meaning every log is forwarded remotely. Set `logLevel: 'off'` to temporarily disable remote delivery.

### Send to multiple destinations

```ts
Logit.setConfig({
  remote: {
    logLevel: 'warn',
    handler: async (type, data) => {
      await Promise.all([sentry.log(type, data), datadog.log(type, data)]);
    },
  },
});
```

## Environment-aware setup

```ts
const isProd = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';

Logit.setConfig({
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

## Best Practices

### 1. Use Scoped Loggers Per Module

```ts
// ✅ one scoped logger per module
const log = Logit.scope('payments');
log.info('charge initiated', { amount: 100 });

// ❌ all logs from one place — hard to filter
console.log('[payments] charge initiated', 100);
```

### 2. Drive Log Level from Environment

```ts
Logit.setConfig({
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
});
```

### 3. Set Up Remote Logging in Production Only

```ts
if (process.env.NODE_ENV === 'production') {
  Logit.setConfig({
    remote: {
      handler: (type, data) => sendToMonitoring(type, data),
      logLevel: 'error',
    },
  });
}
```

### 4. Use `createLogger` for Test Isolation

```ts
// ✅ each test has its own logger — no global state contamination
const log = createLogger({ logLevel: 'off' });
```

### 5. Use Child Loggers to Inherit Config

```ts
const api = Logit.scope('api');
const users = api.scope('users'); // appended namespace: "api.users"
users.info('fetching');
```

## Testing

Prefer `createLogger()` in tests — each instance has its own config, so no global state cleanup is needed:

```ts
import { createLogger } from '@vielzeug/logit';

it('logs info on startup', () => {
  const log = createLogger({ logLevel: 'debug' });
  const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

  log.info('startup');

  expect(spy).toHaveBeenCalled();
  spy.mockRestore();
});
```

To silence the shared `Logit` instance for an entire suite:

```ts
import { Logit } from '@vielzeug/logit';

beforeAll(() => Logit.setConfig({ logLevel: 'off' }));
afterAll(() => Logit.setConfig({ logLevel: 'debug' }));
```

## Next Steps

<div class="vp-doc">
  <div class="custom-block tip">
    <p class="custom-block-title">💡 Continue Learning</p>
    <ul>
      <li><a href="./api">API Reference</a> – Complete API documentation</li>
      <li><a href="./examples">Examples</a> – Practical code examples</li>
      <li><a href="/repl">Interactive REPL</a> – Try it in your browser</li>
    </ul>
  </div>
</div>

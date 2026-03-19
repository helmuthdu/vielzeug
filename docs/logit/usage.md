---
title: Logit — Usage Guide
description: Configuration, scoped loggers, timers, groups, remote logging, and best practices for Logit.
---

# Logit Usage Guide

::: tip New to Logit?
Start with the [Overview](./index.md), then use this page for detailed usage patterns.
:::

[[toc]]

## Logger Instances

`Logit` is the default singleton logger instance. Use `createLogger()` for isolated config.

```ts
const appLog = Logit;
const apiLog = createLogger({ namespace: 'api' });
const authLog = createLogger('auth'); // shorthand namespace
```

Each `createLogger()` call is independent.

## Configuration

Use `setConfig()` for partial updates; unspecified fields remain unchanged.

```ts
Logit.setConfig({
  environment: true,
  logLevel: 'warn',
  namespace: 'App',
  timestamp: true,
  variant: 'symbol',
  remote: {
    handler: (type, data) => {
      void sendToCollector(type, data);
    },
    logLevel: 'error',
  },
});

const cfg: Readonly<LogitConfig> = Logit.config; // snapshot copy
```

Level threshold order:

- `debug` < `trace` < `info` < `success` < `warn` < `error` < `off`

## Logging Methods

```ts
Logit.debug('debug details');
Logit.trace('trace details');
Logit.info('server started', { port: 3000 });
Logit.success('user created', { id: 42 });
Logit.warn('cache stale');
Logit.error('request failed', new Error('timeout'));

Logit.assert(Boolean(process.env.API_URL), 'Missing API URL');
Logit.table([{ id: 1, name: 'Alice' }], ['id', 'name']);
```

Use `enabled()` to avoid expensive debug payload creation:

```ts
if (Logit.enabled('debug')) {
  Logit.debug('diagnostics', buildLargePayload());
}
```

## Scoped Loggers

`scope(name)` appends namespace segments without mutating the parent logger.

```ts
const api = Logit.scope('api');
const auth = api.scope('auth');

api.info('GET /users');
auth.warn('token expiring');
```

## Child Loggers

`child(overrides?)` clones current config and applies overrides.

```ts
const base = createLogger({ logLevel: 'info', namespace: 'app' });
const verbose = base.child({ logLevel: 'debug' });

base.info('base');
verbose.debug('child-only debug');
```

Child and parent configs remain independent after creation.

## Remote Logging

Remote forwarding is asynchronous and non-blocking. Remote and console thresholds are independent.

```ts
Logit.setConfig({
  logLevel: 'debug',
  remote: {
    logLevel: 'warn',
    handler: async (type, data: RemoteLogData) => {
      await fetch('/api/logs', {
        body: JSON.stringify({ level: type, ...data }),
        method: 'POST',
      });
    },
  },
});
```

Remote payload:

- `args`
- `env` (`development` or `production`)
- `namespace?`
- `timestamp?`

## Best Practices

- Create one scoped logger per module boundary.
- Set `logLevel` from environment (`debug` in dev, `warn/error` in prod).
- Use `enabled()` before expensive payload construction.
- Keep remote handlers resilient; network failures should not block app flow.
- Prefer `child()` for temporary overrides (tests, one-off tasks).

## Testing

In tests, silence logs globally or per suite and spy only what you assert.

```ts
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => {
  Logit.setConfig({ logLevel: 'off' });
});

afterEach(() => {
  Logit.setConfig({ logLevel: 'debug' });
  vi.restoreAllMocks();
});

it('logs errors when enabled', () => {
  Logit.setConfig({ logLevel: 'error' });
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

  Logit.error('boom');

  expect(spy).toHaveBeenCalled();
});
```

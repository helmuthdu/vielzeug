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

- `debug` < `trace` < `info` < `warn` < `error` < `fatal` < `off`

## Call Signature

All log methods share a consistent overloaded signature:

```ts
log.info('message')
log.info({ key: 'value' }, 'message')   // context object first, message second
log.error(new Error('boom'))             // Error auto-serialized into context.err
log.error(new Error('boom'), 'override') // message override, err still in context
log.info()                               // zero-arg form — logs without message
```

The `context` object and per-call args are merged with any pinned `withBindings()` context before emission.

## Logging Methods

```ts
Logit.debug('debug details');
Logit.trace('trace details');
Logit.info({ port: 3000 }, 'server started');
Logit.warn('cache stale');
Logit.error(new Error('timeout'));           // auto-serialized
Logit.fatal({ service: 'db' }, 'terminating'); // above error, use for unrecoverable state

Logit.assert(Boolean(process.env.API_URL), 'Missing API URL');
Logit.table([{ id: 1, name: 'Alice' }], ['id', 'name']);
```

Use `enabled()` to avoid expensive debug payload creation:

```ts
if (Logit.enabled('debug')) {
  Logit.debug('diagnostics', buildLargePayload());
}
```

## Pinned Bindings

`withBindings(fields)` returns a child logger where the given fields are merged into every log call. This is the idiomatic way to attach per-request or per-user context.

```ts
const api = Logit.scope('api');

// typical use: per-request context in a server handler
const reqLog = api.withBindings({ requestId: 'abc-123', userId: 42 });
reqLog.info('GET /users');          // always includes requestId and userId
reqLog.warn({ slow: true }, 'query took 2s'); // call-site fields merged in
```

The parent logger is not affected. Bindings stack additively through chained `withBindings()` calls:

```ts
const base = Logit.withBindings({ service: 'api' });
const req  = base.withBindings({ requestId: 'xyz' });
// req emits both service and requestId on every call
```

`bindings` getter returns a snapshot of the currently pinned fields:

```ts
console.log(reqLog.bindings); // { requestId: 'abc-123', userId: 42 }
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
        body: JSON.stringify(data),
        method: 'POST',
      });
    },
  },
});
```

Remote payload shape (`RemoteLogData`):

| Field | Type | Description |
| --- | --- | --- |
| `level` | `LogType` | Log level string |
| `message` | `string?` | Log message |
| `context` | `object?` | Merged bindings + per-call context (includes `err` for Errors) |
| `env` | `'development' \| 'production'` | Runtime environment |
| `namespace` | `string?` | Logger namespace |
| `timestamp` | `string?` | ISO timestamp when enabled |

If a handler throws, a `console.warn` is emitted — remote errors never propagate to the caller.

## Best Practices

- Create one scoped logger per module boundary.
- Use `withBindings()` to pin request/session context instead of repeating fields on each call.
- Set `logLevel` from environment (`debug` in dev, `warn`/`error` in prod).
- Use `enabled()` before expensive payload construction.
- Keep remote handlers resilient; network failures should not block app flow.
- Prefer `child()` for temporary config overrides (tests, one-off tasks).
- Use `fatal()` only for genuinely unrecoverable states; it maps to `console.error` and remote.

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

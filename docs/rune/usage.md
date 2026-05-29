---
title: Rune — Usage Guide
description: Configuration, scoped loggers, timers, groups, remote logging, and best practices for Rune.
---

[[toc]]

::: tip New to Rune?
Start with the [Overview](./index.md), then use this page for detailed usage patterns.
:::

## Logger Instances

`Rune` is the default singleton logger instance. Use `createLogger()` for isolated config.

```ts
const appLog = Rune;
const apiLog = createLogger({ namespace: 'api' });
const authLog = createLogger('auth'); // shorthand namespace
```

Each `createLogger()` call is independent.

## Configuration

Use `child()` to derive immutable logger variants.

```ts
const AppLog = Rune.child({
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

const cfg: Readonly<RuneConfig> = AppLog.config; // snapshot copy
```

Level threshold order:

- `debug` < `info` < `warn` < `error` < `fatal` < `off`

## Call Signature

All log methods share a consistent overloaded signature:

```ts
log.info('message');
log.info({ key: 'value' }, 'message'); // context object first, message second
log.error(new Error('boom')); // Error auto-serialized into context.err
log.error(new Error('boom'), 'override'); // message override, err still in context
```

The `context` object is merged with any pinned `withBindings()` context before emission.
String-first calls accept only a single message argument. Structured data always goes in the first argument.

## Logging Methods

```ts
Rune.debug('debug details');
Rune.info({ port: 3000 }, 'server started');
Rune.warn('cache stale');
Rune.error(new Error('timeout')); // auto-serialized
Rune.fatal({ service: 'db' }, 'terminating'); // above error, use for unrecoverable state
```

Use `enabled()` to avoid expensive debug payload creation:

```ts
if (Rune.enabled('debug')) {
  Rune.debug({ diagnostics: buildLargePayload() }, 'diagnostics');
}
```

## Pinned Bindings

`withBindings(fields)` returns a child logger where the given fields are merged into every log call. This is the idiomatic way to attach per-request or per-user context.

```ts
const api = Rune.scope('api');

// typical use: per-request context in a server handler
const reqLog = api.withBindings({ requestId: 'abc-123', userId: 42 });
reqLog.info('GET /users'); // always includes requestId and userId
reqLog.warn({ slow: true }, 'query took 2s'); // call-site fields merged in
```

The parent logger is not affected. Bindings stack additively through chained `withBindings()` calls:

```ts
const base = Rune.withBindings({ service: 'api' });
const req = base.withBindings({ requestId: 'xyz' });
// req emits both service and requestId on every call
```

`bindings` getter returns a snapshot of the currently pinned fields:

```ts
console.log(reqLog.bindings); // { requestId: 'abc-123', userId: 42 }
```

## Scoped Loggers

`scope(name)` appends namespace segments without mutating the parent logger.

```ts
const api = Rune.scope('api');
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

Remote inheritance behavior in `child()` is explicit:

- Omit `remote` to inherit parent remote settings.
- Pass `remote: null` to disable forwarding on the child.
- Pass `remote: { logLevel }` to keep inherited handler but override threshold.

## Remote Logging

Remote forwarding is asynchronous and non-blocking. Remote and console thresholds are independent.

```ts
const NetLog = Rune.child({
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

| Field       | Type                            | Description                                                    |
| ----------- | ------------------------------- | -------------------------------------------------------------- |
| `level`     | `LogType`                       | Log level string                                               |
| `message`   | `string?`                       | Log message                                                    |
| `context`   | `object?`                       | Merged bindings + per-call context (includes `err` for Errors) |
| `env`       | `'development' \| 'production'` | Runtime environment                                            |
| `namespace` | `string?`                       | Logger namespace                                               |
| `timestamp` | `string?`                       | ISO timestamp when enabled                                     |

If a handler throws, a `console.warn` is emitted — remote errors never propagate to the caller.

## Framework Integration

Rune is framework-agnostic and works as a module-level singleton or a context-injected instance.

::: code-group

```tsx [React]
import { createContext, useContext } from 'react';
import { createLogger } from '@vielzeug/rune';

const LogContext = createContext(createLogger({ namespace: 'app' }));

function useLogger() {
  return useContext(LogContext);
}

function App() {
  const requestLogger = createLogger({ namespace: 'app' }).withBindings({ userId: '42' });
  return (
    <LogContext.Provider value={requestLogger}>
      <Dashboard />
    </LogContext.Provider>
  );
}

function Dashboard() {
  const log = useLogger();
  log.info('Dashboard mounted');
  return <div>Dashboard</div>;
}
```

```ts [Vue 3]
import { provide, inject } from 'vue';
import { createLogger, type Logger } from '@vielzeug/rune';

const LoggerKey = Symbol('logger');

function provideLogger(namespace: string) {
  const logger = createLogger({ namespace });
  provide(LoggerKey, logger);
  return logger;
}

function useLogger(): Logger {
  const logger = inject<Logger>(LoggerKey);
  if (!logger) throw new Error('Logger not provided');
  return logger;
}
```

```svelte [Svelte]
<script lang="ts">
  import { setContext, getContext } from 'svelte';
  import { createLogger } from '@vielzeug/rune';

  // Parent component — provide logger
  const logger = createLogger({ namespace: 'app' });
  setContext('logger', logger);
</script>

<!-- Child component — consume logger -->
<script lang="ts">
  import { getContext } from 'svelte';
  import type { Logger } from '@vielzeug/rune';

  const logger = getContext<Logger>('logger');
  logger.info('component mounted');
</script>
```

:::

### Pitfalls

- **React:** Creating the logger inside the `LoggerProvider` component body without `useRef`/`useMemo` recreates it on every re-render. Use `useState(() => createLogger(...))` for stable initialization.
- **Vue 3:** `inject()` returns `undefined` if called outside of `setup()` — always call it at the top level of a composable or component setup, not inside callbacks.
- **Svelte:** `getContext()` must be called synchronously during component initialization — it cannot be called inside `onMount` or async functions.

## Working with Other Vielzeug Libraries

### With Courier

Forward HTTP errors to a remote log endpoint.

```ts
import { createApi } from '@vielzeug/courier';
import { createLogger } from '@vielzeug/rune';

const log = createLogger({ namespace: 'courier' });
const api = createApi({
  baseUrl: 'https://api.example.com',
  onError: (err) => log.error(err, 'request failed'),
});
```

### With Relay

Log all event dispatches for debugging and audit trails.

```ts
import { createBus } from '@vielzeug/relay';
import { createLogger } from '@vielzeug/rune';

const log = createLogger({ namespace: 'bus' });
const bus = createBus<AppEvents>({
  onDispatch: (event, payload) => log.debug({ event, payload }, 'dispatched'),
  onError: (err, event) => log.error(err, `handler error in "${event}"`),
});
```

## Best Practices

- Create one scoped logger per module boundary.
- Use `withBindings()` to pin request/session context instead of repeating fields on each call.
- Set `logLevel` from environment (`debug` in dev, `warn`/`error` in prod).
- Use `enabled()` before expensive payload construction.
- Keep remote handlers resilient; network failures should not block app flow.
- Prefer `child()` for explicit logger variants (tests, one-off tasks, module scopes).
- Use `fatal()` only for genuinely unrecoverable states; it maps to `console.error` and remote.

## Testing

In tests, silence logs globally or per suite and spy only what you assert.

```ts
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
});

it('logs errors when enabled', () => {
  const log = Rune.child({ logLevel: 'error' });
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

  log.error('boom');

  expect(spy).toHaveBeenCalled();
});
```

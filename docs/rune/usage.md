---
title: Rune — Usage Guide
description: Configuration, transports, scoped loggers, lazy bindings, timers, groups, and best practices for Rune.
---

[[toc]]

::: tip New to Rune?
Start with the [Overview](./index.md), then use this page for detailed usage patterns.
:::

## Basic Usage

Use `createLogger()` to create an isolated logger instance.

```ts
import { createLogger } from '@vielzeug/rune';

const appLog = createLogger();
const apiLog = createLogger({ namespace: 'api' });
const authLog = createLogger('auth'); // shorthand namespace
```

Each `createLogger()` call is fully independent with its own transport pipeline.

The two-arg shorthand combines namespace and options cleanly:

```ts
const log = createLogger('api', { logLevel: 'warn', transports: [transport] });
```

## Transports

Transports are the delivery layer. Every `LogEntry` that passes the logger's level threshold is dispatched to each transport in order. Transports handle their own formatting, level filtering, and delivery.

```ts
import { consoleTransport, createLogger, jsonTransport } from '@vielzeug/rune';

const log = createLogger({
  logLevel: 'debug',
  transports: [
    consoleTransport({ timestamp: true }),
    jsonTransport({ level: 'error' }),
  ],
});
```

When `transports` is omitted, `consoleTransport()` is used automatically.

### Built-in Transport Factories

| Factory              | Use case                                      |
| -------------------- | --------------------------------------------- |
| `consoleTransport()` | Styled console output (default)               |
| `jsonTransport()`    | NDJSON for server-side log aggregation        |
| `remoteTransport()`  | Asynchronous browser or server delivery       |
| `batchTransport()`   | Serialized buffered delivery with flush       |
| `sampleTransport()`  | Probabilistic volume reduction                |
| `redactTransport()`  | Recursive sensitive-field and subtree masking |

### Node.js: Structured JSON Logging

For server-side log pipelines (ELK, Datadog, CloudWatch), `jsonTransport` emits NDJSON to stdout:

```ts
import { jsonTransport } from '@vielzeug/rune';

const log = createLogger({
  namespace: 'api',
  transports: [jsonTransport({ level: 'info' })],
});

log.info('request', { path: '/users', status: 200 });
// Outputs: {"level":"info","time":"2026-05-30T...","ns":"api","path":"/users","status":200,"msg":"request"}
```

### Remote Delivery, Batching, and Redaction

Compose transport wrappers around the delivery boundary. Handle remote failures explicitly in production and dispose the batch during shutdown.

```ts
import { batchTransport, createLogger, redactTransport, remoteTransport } from '@vielzeug/rune';

const remote = remoteTransport({
  handler: (_level, payload) =>
    fetch('/api/logs', { body: JSON.stringify(payload), method: 'POST' }).then((response) => {
      if (!response.ok) throw new Error(`log delivery failed: ${response.status}`);
    }),
  level: 'warn',
  onError: (error) => console.error('log delivery failed', error),
});
const batch = batchTransport({
  onFlush: async (entries) => {
    const response = await fetch('/api/log-batches', { body: JSON.stringify(entries), method: 'POST' });
    if (!response.ok) throw new Error(`batch delivery failed: ${response.status}`);
  },
});
const log = createLogger({
  transports: [redactTransport({ keys: ['password', 'token'], transport: remote })],
});
const batchedLog = createLogger({
  transports: [redactTransport({ keys: ['password', 'token'], transport: batch.transport })],
});

log.error('direct delivery');
batchedLog.error('buffered delivery');
await batch.dispose();
```

`redactTransport()` fails closed: when `maxDepth` is exceeded, the entire deeper subtree is replaced rather than forwarded uninspected.

## Configuration

Use `child()` to derive immutable logger variants.

```ts
const log = createLogger({ namespace: 'app' });
const AppLog = log.child({
  logLevel: 'warn',
  namespace: 'App',
  // transports inherited from parent by default
  // pass transports: [] to disable all, or transports: [...] to replace
});

// Individual getters — no config snapshot
console.log(AppLog.logLevel); // 'warn'
console.log(AppLog.namespace); // 'App'
console.log(AppLog.transports); // [...]
```

Level threshold order: `debug` < `info` < `warn` < `error` < `fatal` < `off`

## Middleware

Use middleware for transformations or filters that must apply once before every transport. Middleware runs in order; returning `null` drops the entry.

```ts
const log = createLogger({
  middleware: [(entry) => ({ ...entry, data: { ...entry.data, environment: 'production' } })],
  transports: [consoleTransport(), jsonTransport()],
});

const errorsOnly = log.use((entry) => (entry.level === 'error' || entry.level === 'fatal' ? entry : null));
```

`use()` returns a new logger and leaves its parent unchanged. A throwing middleware is isolated and drops only the affected entry.

## Call Signature

All log methods support message-first, context-first, and error-first calls:

```ts
log.info('message');
log.info('message', { key: 'value' });
log.debug({ type: 'dispatch', id: 42 }, 'bus:dispatch');
log.error(new Error('boom'), { requestId: 'abc' }, 'request failed');
```

Use message-first for ordinary application logs. Context-first avoids synthetic messages for structured events and matches observation callbacks such as `tap((event) => log.debug(event))`. Error-first automatically stores the serialized error under `err`.

Per-call context is shallow-merged with `withBindings()` bindings into `entry.data`. `Error` values are serialized to `{ message, name, stack }`.

## Logging Methods

```ts
const log = createLogger();
log.debug('debug details');
log.info('server started', { port: 3000 });
log.warn('cache stale');
log.error('request failed', { err: new Error('timeout') }); // Error auto-serialized in context
log.fatal('terminating', { service: 'db' }); // above error, use for unrecoverable state
```

Use `enabled()` to avoid expensive payload construction before the level check:

```ts
if (log.enabled('debug')) {
  log.debug('diagnostics', { diagnostics: buildLargePayload() });
}
```

Or use `lazy()` to let Rune gate it automatically:

```ts
const reqLog = log.withBindings({ diagnostics: lazy(() => buildLargePayload()) });
reqLog.debug('diagnostics'); // buildLargePayload() only called when debug is enabled
```

## Pinned Bindings

`withBindings(fields)` returns a child logger where the given fields are merged into every log call. This is the idiomatic way to attach per-request or per-user context.

```ts
const api = createLogger({ namespace: 'api' });

const reqLog = api.withBindings({ requestId: 'abc-123', userId: 42 });
reqLog.info('GET /users'); // always includes requestId and userId
reqLog.warn('query took 2s', { slow: true }); // call-site fields merged in
```

The parent logger is not affected. Bindings stack additively through chained `withBindings()` calls:

```ts
const base = log.withBindings({ service: 'api' });
const req = base.withBindings({ requestId: 'xyz' });
// req emits both service and requestId on every call
```

The `bindings` getter returns a defensive snapshot:

```ts
console.log(reqLog.bindings); // { requestId: 'abc-123', userId: 42 }
```

## Lazy Bindings

`lazy(fn)` defers evaluation of a binding value until after the level check passes. The factory is never called when the entry would be suppressed.

```ts
import { lazy } from '@vielzeug/rune';

const log = createLogger().withBindings({
  // Only called when debug entries are emitted
  snapshot: lazy(() => JSON.stringify(getFullAppState())),
  // Regular values are always included as-is
  service: 'api',
});

log.debug('state trace'); // snapshot() only called here
log.warn('cache miss'); // snapshot() NOT called — warn doesn't need it
```

Lazy bindings are resolved on every emitted call, not cached:

```ts
const counter = { n: 0 };
const log = createLogger().withBindings({ tick: lazy(() => ++counter.n) });

log.info('a'); // tick: 1
log.info('b'); // tick: 2
```

## Child Loggers

`child(overrides?)` creates a new logger scoped to a namespace, level, or transport set. Use it to create module-level or service-level loggers.

```ts
const api = createLogger({ namespace: 'api' });
const auth = api.child({ namespace: 'auth' }); // → 'api.auth' (dot-joined automatically)

api.info('GET /users');
auth.warn('token expiring');
```

`child(overrides?)` clones current config and applies overrides. Transports are inherited by default.

```ts
const base = createLogger({ logLevel: 'info', namespace: 'app' });
const verbose = base.child({ logLevel: 'debug' }); // inherits transports

// Replace transports entirely on the child
const silent = base.child({ transports: [] }); // no output

// Override with a different transport set
const jsonChild = base.child({ transports: [jsonTransport()] });
```

Child and parent configs remain independent after creation.

## Timing

`time(label, fn, level?)` measures execution time of sync or async functions. Emits a structured entry with `{ duration_ms }` in `data` and `label` as the message. When `fn` throws or rejects, the entry also includes `{ err }` with the serialized error.

```ts
// Sync
const result = log.time('parse', () => parseDocument(input));
// Emits: { level: 'debug', message: 'parse', data: { duration_ms: 2.4 } }

// Async
const users = await log.time('db.users', () => db.query('SELECT * FROM users'));
// Emits even on rejection, with { err } included in data

// Custom level
log.time('health-check', () => ping(), 'info');

// Skipped when logLevel is 'off', but fn still executes
```

## Groups

`group(label, fn, level?)` and `groupCollapsed(label, fn, level?)` wrap a callback in a console group, ensuring `groupEnd` is called even when the callback throws or rejects.

```ts
await log.groupCollapsed('Job', async () => {
  await log.time('process', () => runJob());
  log.info('Done');
});

// Gate the group header on a log level — suppresses when logLevel is above 'debug'
log.group(
  'verbose trace',
  () => {
    log.debug('internal state', { state });
  },
  'debug',
);
```

When `logLevel` is `'off'`, the group wrapper is bypassed but the callback still executes. When a `level` is provided and it is below the configured threshold, the group header is skipped but the callback still runs.

## Testing

Use a test transport to assert log entries without mocking `console`. This approach is more robust and does not require spy cleanup:

```ts
import { expect, it } from 'vitest';
import { createLogger } from '@vielzeug/rune';
import type { LogEntry, Transport } from '@vielzeug/rune';

function createTestTransport() {
  const entries: LogEntry[] = [];
  const transport: Transport = (entry) => entries.push(entry);
  return { entries, transport };
}

it('logs errors when enabled', () => {
  const { entries, transport } = createTestTransport();
  const log = createLogger({ logLevel: 'error', transports: [transport] });

  log.error('boom');

  expect(entries).toHaveLength(1);
  expect(entries[0].level).toBe('error');
  expect(entries[0].message).toBe('boom');
});

it('suppresses debug when logLevel is warn', () => {
  const { entries, transport } = createTestTransport();
  const log = createLogger({ logLevel: 'warn', transports: [transport] });

  log.debug('silent');
  log.warn('loud');

  expect(entries).toHaveLength(1);
});
```

You can still spy on `console` methods when testing `consoleTransport` output directly:

```ts
import { afterEach, expect, it, vi } from 'vitest';
import { consoleTransport, createLogger } from '@vielzeug/rune';

afterEach(() => vi.restoreAllMocks());

it('writes error to console.error', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const log = createLogger({ logLevel: 'error', transports: [consoleTransport({ timestamp: false })] });

  log.error('boom');

  expect(spy).toHaveBeenCalled();
});
```

## Framework Integration

Rune is framework-agnostic and works as a module-level singleton or a context-injected instance.

::: code-group

```tsx [React]
import { createContext, useState, useContext } from 'react';
import { createLogger } from '@vielzeug/rune';

const LogContext = createContext(createLogger({ namespace: 'app' }));

function useLogger() {
  return useContext(LogContext);
}

function App() {
  const [requestLogger] = useState(() => createLogger({ namespace: 'app' }).withBindings({ userId: '42' }));
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
import { inject, provide } from 'vue';
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

  const logger = createLogger({ namespace: 'app' });
  setContext('logger', logger);
</script>

<!-- Child component -->
<script lang="ts">
  import { getContext } from 'svelte';
  import type { Logger } from '@vielzeug/rune';

  const logger = getContext<Logger>('logger');
  logger.info('component mounted');
</script>
```

:::

### Pitfalls

- **React:** Creating the logger without a stable initializer recreates it on every re-render. Use `useState(() => createLogger(...))`.
- **Vue 3:** `inject()` must be called at the top level of `setup()`, not inside callbacks.
- **Svelte:** `getContext()` must be called synchronously during component initialization.

## Working with Other Vielzeug Libraries

### With Courier

```ts
import { createCourier, withLogging } from '@vielzeug/courier';
import { createLogger } from '@vielzeug/rune';

const log = createLogger({ namespace: 'courier' });
const courier = createCourier({
  baseUrl: 'https://api.example.com',
  middleware: [withLogging({ logger: (message, meta) => log.debug(message, meta) })],
});
```

### With Herald

```ts
import { createBus } from '@vielzeug/herald';
import { createLogger } from '@vielzeug/rune';

const log = createLogger({ namespace: 'bus' });
const bus = createBus<AppEvents>({
  onDispatch: (event, payload) => log.debug('dispatched', { event, payload }),
  onError: (err, event) => log.error(`handler error in "${event}"`, { err }),
});
```

## Best Practices

- Create one child logger per module boundary using `createLogger('module.name')` or `log.child({ namespace: 'module.name' })`.
- Use `withBindings()` to pin request/session context instead of repeating fields on each call.
- Use `lazy()` for expensive diagnostics bindings only needed at `debug` level.
- Set `logLevel` from environment (`'debug'` in dev, `'warn'` or `'error'` in prod).
- Use `enabled()` before expensive payload construction that `lazy()` cannot defer.
- Configure transports at the application root; pass scoped loggers via DI or context.
- To style console output, pass `consoleTransport({ theme })` explicitly in `transports`.
- Use `fatal()` only for genuinely unrecoverable states.

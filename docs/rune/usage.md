---
title: Rune — Usage Guide
description: Configuration, transports, scoped loggers, lazy bindings, timers, groups, and best practices for Rune.
---

[[toc]]

::: tip New to Rune?
Start with the [Overview](./index.md), then use this page for detailed usage patterns.
:::

## Logger Instances

`Rune` is the default singleton logger instance. Use `createLogger()` for isolated config.

```ts
import { Rune, createLogger } from '@vielzeug/rune';

const appLog = Rune;
const apiLog = createLogger({ namespace: 'api' });
const authLog = createLogger('auth'); // shorthand namespace
```

Each `createLogger()` call is fully independent with its own transport pipeline.

## Transports

Transports are the delivery layer. Every `LogEntry` that passes the logger's level threshold is dispatched to each transport in order. Transports handle their own formatting, level filtering, and delivery.

```ts
import { createLogger } from '@vielzeug/rune';
import { consoleTransport, remoteTransport, jsonTransport } from '@vielzeug/rune';

const log = createLogger({
  logLevel: 'debug',
  transports: [
    // Console output with CSS badges (browser) or plain text (Node)
    consoleTransport({ variant: 'symbol', timestamp: true }),
    // Remote delivery — only errors and above
    remoteTransport(async (type, data) => {
      await fetch('/api/logs', { body: JSON.stringify(data), method: 'POST' });
    }, { level: 'error' }),
  ],
});
```

When `transports` is omitted, `consoleTransport()` is used automatically.

### Built-in Transport Factories

| Factory              | Use case                                    |
| -------------------- | ------------------------------------------- |
| `consoleTransport()` | Styled console output (default)             |
| `remoteTransport()`  | HTTP/webhook delivery                       |
| `jsonTransport()`    | NDJSON for server-side log aggregation      |
| `batchTransport()`   | Buffered delivery to reduce I/O overhead    |
| `sampleTransport()`  | Probabilistic volume reduction              |
| `redactTransport()`  | Sensitive field stripping before forwarding |

### Composing Transports

Transport factories are composable wrappers. Chain them to build a pipeline:

```ts
import { batchTransport, redactTransport, remoteTransport, sampleTransport } from '@vielzeug/rune';

const log = createLogger({
  transports: [
    consoleTransport({ level: 'debug' }),
    // redact sensitive fields, sample at 10%, batch + flush every 30s
    redactTransport({
      keys: ['password', 'token'],
      transport: sampleTransport({
        rate: 0.1,
        transport: batchTransport({
          onFlush: (entries) => sendToDatadog(entries),
          interval: 30_000,
        }),
      }),
    }),
  ],
});
```

### Batch Transport Lifecycle

`batchTransport` starts an interval timer on first use. Call `.dispose()` on application shutdown to flush remaining entries and stop the timer:

```ts
const batch = batchTransport({
  onFlush: (entries) => sendToCollector(entries),
  interval: 10_000,
  maxSize: 100,
});

const log = createLogger({ transports: [batch] });

// on shutdown
process.on('exit', () => batch.dispose());
```

### Node.js: Structured JSON Logging

For server-side log pipelines (ELK, Datadog, CloudWatch), `jsonTransport` emits NDJSON to stdout:

```ts
import { jsonTransport } from '@vielzeug/rune';

const log = createLogger({
  namespace: 'api',
  transports: [jsonTransport({ level: 'info' })],
});

log.info({ path: '/users', status: 200 }, 'request');
// Outputs: {"level":"info","time":"2026-05-30T...","ns":"api","path":"/users","status":200,"msg":"request"}
```

## Configuration

Use `child()` to derive immutable logger variants.

```ts
const AppLog = Rune.child({
  logLevel: 'warn',
  namespace: 'App',
  // transports inherited from Rune by default
  // pass transports: [] to disable all, or transports: [...] to replace
});

const cfg: Readonly<RuneConfig> = AppLog.config; // snapshot copy
```

Level threshold order: `debug` < `info` < `warn` < `error` < `fatal` < `off`

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

Use `enabled()` to avoid expensive payload construction before the level check:

```ts
if (Rune.enabled('debug')) {
  Rune.debug({ diagnostics: buildLargePayload() }, 'diagnostics');
}
```

Or use `lazy()` to let Rune gate it automatically:

```ts
const reqLog = Rune.withBindings({ diagnostics: lazy(() => buildLargePayload()) });
reqLog.debug('diagnostics'); // buildLargePayload() only called when debug is enabled
```

## Pinned Bindings

`withBindings(fields)` returns a child logger where the given fields are merged into every log call. This is the idiomatic way to attach per-request or per-user context.

```ts
const api = Rune.scope('api');

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

The `bindings` getter returns a defensive snapshot:

```ts
console.log(reqLog.bindings); // { requestId: 'abc-123', userId: 42 }
```

## Lazy Bindings

`lazy(fn)` defers evaluation of a binding value until after the level check passes. The factory is never called when the entry would be suppressed.

```ts
import { lazy } from '@vielzeug/rune';

const log = Rune.withBindings({
  // Only called when debug entries are emitted
  snapshot: lazy(() => JSON.stringify(getFullAppState())),
  // Regular values are always included as-is
  service: 'api',
});

log.debug('state trace'); // snapshot() only called here
log.warn('cache miss');   // snapshot() NOT called — warn doesn't need it
```

Lazy bindings are resolved on every emitted call, not cached:

```ts
const counter = { n: 0 };
const log = Rune.withBindings({ tick: lazy(() => ++counter.n) });

log.info('a'); // tick: 1
log.info('b'); // tick: 2
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

`time(label, fn)` measures execution time of sync or async functions. Unlike `console.time`, it emits a structured `debug` entry with `{ duration_ms }` that flows through all transports — including remote.

```ts
// Sync
const result = log.time('parse', () => parseDocument(input));
// Emits: { level: 'debug', message: 'timer: parse', context: { duration_ms: 2.4 } }

// Async
const users = await log.time('db.users', () => db.query('SELECT * FROM users'));
// groupEnd / timeEnd is called even on rejection

// Skipped when logLevel is 'off', but fn still executes
```

To forward timing data to a remote endpoint, include `remoteTransport` in the pipeline — `debug`-level entries will be forwarded at its threshold.

## Groups

`group(label, fn)` and `groupCollapsed(label, fn)` wrap a callback in a console group, ensuring `groupEnd` is called even when the callback throws or rejects.

```ts
await log.groupCollapsed('Job', async () => {
  await log.time('process', () => runJob());
  log.info('Done');
});
```

When `logLevel` is `'off'`, the group wrapper is bypassed but the callback still executes.

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
  const [requestLogger] = useState(() =>
    createLogger({ namespace: 'app' }).withBindings({ userId: '42' }),
  );
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
import { createApi } from '@vielzeug/courier';
import { createLogger } from '@vielzeug/rune';

const log = createLogger({ namespace: 'courier' });
const api = createApi({
  baseUrl: 'https://api.example.com',
  onError: (err) => log.error(err, 'request failed'),
});
```

### With Herald

```ts
import { createBus } from '@vielzeug/herald';
import { createLogger } from '@vielzeug/rune';

const log = createLogger({ namespace: 'bus' });
const bus = createBus<AppEvents>({
  onDispatch: (event, payload) => log.debug({ event, payload }, 'dispatched'),
  onError: (err, event) => log.error(err, `handler error in "${event}"`),
});
```

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

## Best Practices

- Create one scoped logger per module boundary using `Rune.scope('module.name')`.
- Use `withBindings()` to pin request/session context instead of repeating fields on each call.
- Use `lazy()` for expensive diagnostics bindings only needed at `debug` level.
- Set `logLevel` from environment (`'debug'` in dev, `'warn'` or `'error'` in prod).
- Use `enabled()` before expensive payload construction that `lazy()` cannot defer.
- Configure transports at the application root; pass scoped loggers via DI or context.
- Keep remote handlers resilient — network failures should not block app flow.
- Call `batchTransport.dispose()` on shutdown to flush remaining buffered entries.
- Use `redactTransport` closest to any remote/persistent transport — never strip before console.
- Use `fatal()` only for genuinely unrecoverable states.

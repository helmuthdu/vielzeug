---
title: Rune 3 Migration
description: Migrate from Rune 2 to Rune 3 — explicit logger construction, direct transport arrays, and fail-closed redaction.
---

[[toc]]

## Rune 3 Changes

Rune 3 removes shared singleton state and the redundant `pipe()` fan-out helper. Production delivery primitives and middleware remain first-class, while log methods now support a preferred message-first form alongside structured and Error-first calls.

Removed APIs:

- `defaultLogger` — create logger instances explicitly with `createLogger()`
- `pipe()` and `PipeOptions` — pass multiple transports directly to `createLogger({ transports })`
- `RuneTransportError` — transport and middleware failures remain isolated rather than escaping to application code

Retained APIs:

- `remoteTransport()`, `batchTransport()`, `sampleTransport()`, and `redactTransport()`
- `LogMiddleware`, `RuneOptions.middleware`, `Logger.use()`, and `Logger.middleware`
- Context-first and Error-first log calls, plus the preferred message-first form

## Replace defaultLogger

Create logger instances explicitly so ownership, configuration, and disposal are visible.

```ts
// Rune 2
import { defaultLogger } from '@vielzeug/rune';
const log = defaultLogger.child({ namespace: 'app' });
```

```ts
// Rune 3
import { createLogger } from '@vielzeug/rune';
const log = createLogger({ namespace: 'app' });
```

## Replace pipe()

Pass transports directly to the logger. Dispatch already isolates synchronous failures so one transport cannot block its siblings.

```ts
// Rune 2
const log = createLogger({
  transports: [pipe(consoleTransport(), jsonTransport())],
});
```

```ts
// Rune 3
const log = createLogger({
  transports: [consoleTransport(), jsonTransport()],
});
```

## Prefer Message-First Logging

Message-first calls are easiest to scan in application code. Context-first remains available for structured events and callback adapters; Error-first remains available for forwarding failures without manual wrapping.

```ts
log.info('request started', { requestId });
log.debug({ type: 'dispatch', payload }, 'bus:dispatch');
log.error(err, { requestId }, 'request failed');
```

## Keep Cross-Transport Middleware

Middleware still transforms or filters an entry once before every transport. `use()` returns a new logger and does not mutate its parent.

```ts
const log = createLogger({
  middleware: [(entry) => ({ ...entry, data: { ...entry.data, env: 'production' } })],
  transports: [consoleTransport(), jsonTransport()],
});

const errorsOnly = log.use((entry) => (entry.level === 'error' || entry.level === 'fatal' ? entry : null));
```

## Update Depth-Limited Redaction

Rune 2 stopped inspecting values beyond `maxDepth` and forwarded those subtrees unchanged. Rune 3 fails closed by replacing the entire deeper subtree.

```ts
const safe = redactTransport({
  keys: ['password', 'token'],
  maxDepth: 10,
  transport: remoteTransport({
    handler: (_level, data) => fetch('/api/logs', { body: JSON.stringify(data), method: 'POST' }),
    onError: (error) => console.error('log delivery failed', error),
  }),
});
```

If downstream consumers relied on deeply nested non-sensitive values, raise `maxDepth` deliberately or flatten the logged context. Do not disable the limit for untrusted object graphs.

## Preserve Production Delivery

Remote delivery, batching, and sampling remain composable transport factories. Observe asynchronous failures and dispose batch handles during shutdown.

```ts
const remote = remoteTransport({
  handler: (_level, data) => fetch('/api/logs', { body: JSON.stringify(data), method: 'POST' }),
  onError: (error) => console.error('log delivery failed', error),
});
const batch = batchTransport({
  onFlush: (entries) => fetch('/api/log-batches', { body: JSON.stringify(entries), method: 'POST' }),
});
const log = createLogger({ transports: [sampleTransport({ rate: 0.25, transport: remote }), batch.transport] });

await batch.dispose();
```

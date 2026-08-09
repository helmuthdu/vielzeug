---
title: Rune 2 Migration
description: Migrate batch transport shutdown code and removed transport error imports to Rune 2.
---

[[toc]]

## Rune 2 Changes

Rune 2 keeps logger call forms, groups, and transport composition unchanged. Batch delivery is now awaitable so graceful shutdown can observe every accepted `onFlush` result.

Removed APIs:

- `BatchHandle[Symbol.dispose]()`
- `RuneTransportError`

## Await Batch Delivery

`flush()` and `dispose()` now return `Promise<void>`. Await either method when you need delivery completion.

```ts
// Rune 1
batch.flush();
batch.dispose();
```

```ts
// Rune 2
await batch.flush();
await batch.dispose();
```

A rejected `onFlush` rejects matching manual `flush()` calls. Failed timer or size-triggered delivery is reported through `onFlushError` and rejects later `dispose()`. Put retry logic inside `onFlush` when successful retry should fulfill the drain promise.

```ts
const batch = batchTransport({
  onFlush: async (entries) => {
    await sendWithRetry(entries);
  },
});
```

Timer and size-triggered flushes continue asynchronously. They are serialized with manual flushes and disposal, so `onFlush` never overlaps for one batch handle.

## Replace Synchronous Disposal

Replace `using` with `await using` when lexical scope owns a batch handle.

```ts
// Rune 1
using batch = batchTransport({ onFlush });
```

```ts
// Rune 2
await using batch = batchTransport({ onFlush });
```

Use `await batch.dispose()` in application-owned graceful shutdown. Do not call async cleanup from a Node `exit` handler: Node cannot wait for its promise.

```ts
async function shutdown() {
  await batch.dispose();
  server.close();
}
```

## Remove RuneTransportError Imports

`RuneTransportError` was never thrown to application code. Remove its import; transport failures remain isolated through development warnings and sibling transport dispatch.

```ts
// Rune 1
import { RuneTransportError } from '@vielzeug/rune';

if (RuneTransportError.is(error)) report(error);
```

```ts
// Rune 2
// No replacement import or catch is required.
```

Use `onFlushError`, plus rejected `flush()` and `dispose()` promises, to observe batch-delivery failures.

## Validate Numeric Transport Options

Rune now rejects invalid numeric options during factory construction:

- `sampleTransport({ rate })` requires finite `rate` from `0` through `1`.
- `batchTransport({ interval, maxSize, maxBuffer })` requires positive finite `interval`, positive integer `maxSize`, and non-negative integer `maxBuffer`.
- `redactTransport({ maxDepth })` requires non-negative integer `maxDepth`.

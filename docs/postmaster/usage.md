---
title: Postmaster — Usage Guide
description: Define durable jobs, process them with leases, retry failures, and recover dead-letter work.
---

[[toc]]

## Basic Usage

Define typed jobs, create a durable store, enqueue work, and start the processor. Dispose both handles when the owner ends.

```ts
import { createPostmaster, defineJobs } from '@vielzeug/postmaster';
import { createIndexedDbPostmasterStore } from '@vielzeug/postmaster/indexeddb';

const jobs = defineJobs({
  createTodo: {
    version: 1,
    validate: (v: unknown) => v as { id: string; title: string },
    key: (p) => p.id,
    execute: async (payload, { key, signal }) => {
      await fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Idempotency-Key': key },
        signal,
      });
    },
  },
});

const store = createIndexedDbPostmasterStore({ name: 'my-app-outbox' });
const postmaster = createPostmaster({ jobs, store });

await postmaster.enqueue('createTodo', { id: crypto.randomUUID(), title: 'Buy milk' });
await postmaster.start();

// On page unload:
await postmaster.dispose();
await store.dispose();
```

The store is borrowed by `createPostmaster()` and is not disposed with the processor. Dispose both explicitly.

## At-least-once delivery and idempotency

Postmaster provides **at-least-once delivery**. A crash after the remote write but before local completion can repeat the job. Every job must derive a stable idempotency key, and handlers must send or otherwise enforce that key.

```ts
const jobs = defineJobs({
  createTodo: {
    version: 1,
    validate: (v: unknown) => v as { id: string; title: string },
    key: (p) => p.id,
    execute: async (payload, { key, signal }) => {
      await fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Idempotency-Key': key },
        signal,
      });
    },
  },
});
```

Never assume exactly-once execution. Design handlers so a repeated delivery is safe.

## Postmaster jobs vs Courier mutations

Courier performs immediate HTTP requests and cache reconciliation. Postmaster coordinates durable delivery. Use Courier inside a Postmaster job when the write must survive reloads.

```ts
import { createCourier, CourierNetworkError } from '@vielzeug/courier';
import { createPostmaster, defineJobs } from '@vielzeug/postmaster';

const courier = createCourier({ baseUrl: 'https://api.example.com' });

const jobs = defineJobs({
  createTodo: {
    version: 1,
    validate: (v: unknown) => v as { id: string; title: string },
    key: (p) => p.id,
    execute: async (payload, { key, signal }) => {
      await courier.mutate({
        request: () =>
          courier.post('/todos', {
            body: payload,
            headers: { 'Idempotency-Key': key },
            signal,
          }),
        invalidateKeys: [['todos']],
      });
    },
    retry: { maxAttempts: 5, shouldRetry: (error) => error instanceof CourierNetworkError },
  },
});
```

Postmaster does not import Courier. The integration happens in your job definitions.

## Payload and version migration

Each job declares a `version` and an optional `validate` function. When a stored job's version is older than the registered version, Postmaster calls `migrate()` before validating. `validate` is called once at enqueue; omit it to accept the payload as-is. `validate` accepts a plain function `(value: unknown) => T` or any structural parser with `parse(value: unknown): T` — Spell schemas work directly:

```ts
import { s } from '@vielzeug/spell';

const jobs = defineJobs({
  createTodo: {
    version: 2,
    validate: s.object({ id: s.string(), title: s.string(), priority: s.number().optional() }),
    key: (p) => p.id,
    migrate: (payload, fromVersion) => {
      if (fromVersion === 1) return { ...(payload as { id: string; title: string }), priority: 0 };
      return payload;
    },
    execute: async (payload, { key, signal }) => {
      await fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Idempotency-Key': key },
        signal,
      });
    },
  },
});
```

Unknown job names, incompatible versions, failed migrations, and invalid persisted payloads move to dead-letter rather than being executed.

## Retry semantics

Retries are opt-in and explicitly classified. No `retry` block means one attempt followed by dead-letter.

```ts
const jobs = defineJobs({
  syncTodo: {
    version: 1,
    validate: (v: unknown) => v as { id: string },
    key: (p) => p.id,
    execute: async (payload, { signal }) => {
      await fetch(`/api/todos/${payload.id}/sync`, { signal });
    },
    retry: {
      maxAttempts: 5,
      shouldRetry: (error) => error instanceof TypeError, // network errors only
    },
  },
});
```

- `maxAttempts` means total executions, including the first.
- `shouldRetry` is required when retries are enabled. Postmaster never guesses whether a write is safe to repeat.
- Default delay uses Arsenal's deterministic `backoff(attempt)` helper. Override with `delay`.
- Delay must be finite and non-negative.
- Lifecycle aborts caused by disposal are not classified as job failures.

## Delayed eligibility

`enqueue()` accepts an optional `availableAt` timestamp. The job persists immediately but cannot be claimed before that time. Use this for scheduled writes, cooldowns, or any work that must survive a reload but should not run yet.

```ts
await postmaster.enqueue('sendDigest', { userId }, { availableAt: Date.now() + 60_000 });
```

Postmaster does not guarantee execution at `availableAt` — only that the job will not be claimed earlier. A live processor (`start()` or `flush()`) is required for execution. In a browser, a closed page or suspended service worker will run the job when the processor next becomes active. Past timestamps remain immediately eligible. The same mechanism already backs retry delays, so delayed eligibility reuses the existing claim, wake, and persistence paths.

## Dead-letter recovery

Jobs that exhaust retries or hit a terminal failure move to dead-letter. Inspect, retry, or remove them.

```ts
const deadLettered = await postmaster.list({ status: 'dead-letter' });

for (const entry of deadLettered) {
  console.log(entry.id, entry.name, entry.failure);
}

// Retry a dead-letter job back into the queue.
await postmaster.retry(entry.id);

// Or remove it permanently.
await postmaster.remove(entry.id);
```

`retry()` and `remove()` return discriminated results so callers can distinguish `not-found`, `not-dead-letter`, `running`, and successful outcomes without exceptions.

## Lifecycle and disposal

`start()` begins background processing. `dispose()` stops claiming new work, aborts owned work, and is idempotent. `flush()` processes every available job synchronously.

```ts
await postmaster.start();
// ...on unload
await postmaster.dispose();
await store.dispose();
```

Disposal aborts owned work, releases the active lease, and is idempotent. A controlled disposal abort does not consume the attempt — the job returns to queued.

## Events

Tap runtime events for observability. Handler errors are swallowed — observability never affects processing.

```ts
const unsubscribe = postmaster.tap((event) => {
  switch (event.type) {
    case 'enqueued':
      console.log('enqueued', event.entry.id);
      break;
    case 'completed':
      console.log('completed', event.entry.id);
      break;
    case 'dead-lettered':
      console.error('dead-lettered', event.entry.id, event.entry.failure);
      break;
    case 'processor-error':
      console.error('processor error', event.error);
      break;
  }
});
```

Pass an `AbortSignal` to auto-detach:

```ts
const controller = new AbortController();
postmaster.tap(handler, { signal: controller.signal });
controller.abort(); // stops tapping
```

## Testing

Use the in-memory store for deterministic tests.

```ts
import { createPostmaster, defineJobs } from '@vielzeug/postmaster';
import { createMemoryPostmasterStore } from '@vielzeug/postmaster/testing';

const store = createMemoryPostmasterStore();
const postmaster = createPostmaster({
  jobs: defineJobs({
    send: {
      version: 1,
      validate: (v: unknown) => String(v),
      key: (p) => p,
      execute: async () => {},
    },
  }),
  store,
});

await postmaster.enqueue('send', 'hello');
await postmaster.flush();
await postmaster.dispose();
```

Inject a deterministic clock to control retry scheduling.

```ts
let now = 0;
const postmaster = createPostmaster({ clock: () => now, jobs, store });
```

## Framework Integration

Create the Postmaster after the component mounts, start processing, and dispose on unmount.

::: code-group

```tsx [React]
import { createIndexedDbPostmasterStore } from '@vielzeug/postmaster/indexeddb';
import { createPostmaster, defineJobs, type Postmaster } from '@vielzeug/postmaster';
import { useEffect } from 'react';

const jobs = defineJobs({
  sync: {
    version: 1,
    validate: (v: unknown) => v as { id: string },
    key: (p) => p.id,
    execute: async (payload, { signal }) => {
      await fetch(`/api/sync/${payload.id}`, { signal });
    },
  },
});

export function OutboxProvider() {
  useEffect(() => {
    const store = createIndexedDbPostmasterStore({ name: 'outbox' });
    const postmaster = createPostmaster({ jobs, store });
    void postmaster.start();

    return () => {
      void postmaster.dispose();
      void store.dispose();
    };
  }, []);

  return null;
}
```

```vue [Vue 3]
<script setup lang="ts">
import { createIndexedDbPostmasterStore } from '@vielzeug/postmaster/indexeddb';
import { createPostmaster, defineJobs } from '@vielzeug/postmaster';
import { onMounted, onUnmounted } from 'vue';

const jobs = defineJobs({
  sync: {
    version: 1,
    validate: (v: unknown) => v as { id: string },
    key: (p) => p.id,
    execute: async (payload, { signal }) => {
      await fetch(`/api/sync/${payload.id}`, { signal });
    },
  },
});

let postmaster: ReturnType<typeof createPostmaster> | undefined;
let store: ReturnType<typeof createIndexedDbPostmasterStore> | undefined;

onMounted(() => {
  store = createIndexedDbPostmasterStore({ name: 'outbox' });
  postmaster = createPostmaster({ jobs, store });
  void postmaster.start();
});

onUnmounted(() => {
  void postmaster?.dispose();
  void store?.dispose();
});
</script>

<template>
  <slot />
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { createIndexedDbPostmasterStore } from '@vielzeug/postmaster/indexeddb';
  import { createPostmaster, defineJobs } from '@vielzeug/postmaster';
  import { onMount } from 'svelte';

  const jobs = defineJobs({
    sync: {
      version: 1,
      validate: (v: unknown) => v as { id: string },
      key: (p) => p.id,
      execute: async (payload, { signal }) => {
        await fetch(`/api/sync/${payload.id}`, { signal });
      },
    },
  });

  onMount(() => {
    const store = createIndexedDbPostmasterStore({ name: 'outbox' });
    const postmaster = createPostmaster({ jobs, store });
    void postmaster.start();

    return () => {
      void postmaster.dispose();
      void store.dispose();
    };
  });
</script>

<slot />
```

:::

## Working with Other Vielzeug Libraries

### Postmaster + Courier

Use Courier inside job handlers for HTTP transport and cache invalidation. Postmaster coordinates delivery; Courier performs the request.

```ts
import { createCourier, CourierNetworkError } from '@vielzeug/courier';
import { createPostmaster, defineJobs } from '@vielzeug/postmaster';

const courier = createCourier({ baseUrl: 'https://api.example.com' });

const jobs = defineJobs({
  createTodo: {
    version: 1,
    validate: (v: unknown) => v as { id: string; title: string },
    key: (p) => p.id,
    execute: async (payload, { key, signal }) => {
      await courier.mutate({
        request: () =>
          courier.post('/todos', {
            body: payload,
            headers: { 'Idempotency-Key': key },
            signal,
          }),
        invalidateKeys: [['todos']],
      });
    },
    retry: { maxAttempts: 5, shouldRetry: (e) => e instanceof CourierNetworkError },
  },
});
```

### Postmaster + Sentinel

Flush the outbox when the network returns. Sentinel reports online state; Postmaster does the rest.

```ts
import { createNetwork } from '@vielzeug/sentinel';
import { createPostmaster } from '@vielzeug/postmaster';

const network = createNetwork();
const postmaster = createPostmaster({ jobs, store });

const unsubscribe = network.subscribe(() => {
  if (network.value.online) void postmaster.flush();
});

// On teardown:
unsubscribe();
network.dispose();
await postmaster.dispose();
```

### Postmaster + Vault

The IndexedDB adapter is built on Vault. Use Vault directly for unrelated storage; the Postmaster store owns its own database name.

## Best Practices

- **Derive** a stable idempotency key from every job payload and send it with the remote write.
- **Dispose** both the processor and the store explicitly; the processor does not own the store.
- **Classify** retryable errors explicitly with `shouldRetry`; never let Postmaster guess.
- **Migrate** persisted payloads when job versions change; test migrations against stored fixtures.
- **Inspect** the dead-letter queue regularly and retry or remove terminal failures.
- **Avoid** persisting sensitive data in payloads or failure messages; IndexedDB is per-origin but not encrypted.
- **Flush** the outbox when Sentinel reports the network returns.
- **Test** with the in-memory store and a deterministic clock for reproducible retry timing.

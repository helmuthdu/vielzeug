---
title: Postmaster — Durable job outbox
description: Typed durable job outbox with leased processing, retries, and dead-letter recovery for browser applications.
package: postmaster
category: Async
keywords: [durable, outbox, jobs, retry, dead-letter, idempotency, indexeddb, lease]
related: [courier, vault, sentinel, familiar, ripple]
exports: [createPostmaster, defineJobs, createIndexedDbPostmasterStore, createMemoryPostmasterStore, PostmasterError, PostmasterDisposedError, PostmasterJobError]
environments: [browser, node]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="postmaster" />

## Why Postmaster?

Application jobs that touch a remote service — posting a form, syncing state, sending analytics — must survive page reloads, resume later, retry according to an explicit policy, and retain terminal failures for recovery. Postmaster coordinates that delivery with typed job definitions, leased processing, and a dead-letter queue, all backed by IndexedDB.

```ts
// Before
async function createTodo(payload: { id: string; title: string }) {
  // Lost on reload. No retry. No recovery. Silent failure.
  await fetch('/api/todos', { method: 'POST', body: JSON.stringify(payload) });
}

// After
import { createPostmaster, defineJobs } from '@vielzeug/postmaster';
import { createIndexedDbPostmasterStore } from '@vielzeug/postmaster/indexeddb';
import { s } from '@vielzeug/spell';

const jobs = defineJobs({
  createTodo: {
    version: 1,
    validate: s.object({ id: s.string(), title: s.string() }),
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
```

| Feature | Postmaster | Ad hoc outbox | Familiar |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="postmaster" type="size" /> | Application-defined | <PackageInfo package="familiar" type="size" /> |
| Zero dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Survives page reload | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Leased cross-tab processing | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Dead-letter recovery | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Typed job payloads | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |

<div class="decision-callout">

**Use Postmaster when** application jobs must survive reloads, retry explicitly, and remain recoverable after terminal failure.

**Consider Familiar when** jobs are CPU-bound, in-memory only, and never need to survive a page reload.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/postmaster
```

```sh [npm]
npm install @vielzeug/postmaster
```

```sh [yarn]
yarn add @vielzeug/postmaster
```

:::

For browser persistence, also install `@vielzeug/vault` (a workspace peer of the IndexedDB adapter):

::: code-group

```sh [pnpm]
pnpm add @vielzeug/postmaster @vielzeug/vault
```

```sh [npm]
npm install @vielzeug/postmaster @vielzeug/vault
```

```sh [yarn]
yarn add @vielzeug/postmaster @vielzeug/vault
```

:::

## Quick Start

Define typed jobs, create a durable store, enqueue work, and start the processor. Dispose both the processor and the store when the page lifetime ends.

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
    retry: { maxAttempts: 5, shouldRetry: () => true },
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

<div class="features-grid">

## Features

- `defineJobs()` — Typed job registry with payload inference and validation.
- `createPostmaster()` — Processor with leased claims, heartbeat renewal, and crash recovery.
- `enqueue()` — Persist a job and wake the processor.
- `flush()` — Process every available job until the queue is empty.
- `retry()` / `remove()` — Recover or discard dead-letter jobs.
- `subscribe()` — Typed events for enqueued, started, completed, retry-scheduled, dead-lettered, removed, lease-lost, and processor-error.
- `createIndexedDbPostmasterStore()` — Durable browser store backed by Vault IndexedDB.
- `createMemoryPostmasterStore()` — Deterministic in-memory store for tests.

</div>

<div class="doc-links">

## Documentation

- [**Usage Guide**](./usage.md)
- [**API Reference**](./api.md)
- [**Examples**](./examples.md)

</div>

<div class="see-also">

## See Also

- [@vielzeug/courier](../courier/) — Perform the HTTP requests Postmaster jobs coordinate.
- [@vielzeug/vault](../vault/) — IndexedDB storage primitive backing the durable store.
- [@vielzeug/sentinel](../sentinel/) — Flush the outbox when the network returns.
- [@vielzeug/familiar](../familiar/) — In-memory Web Worker pool for CPU-bound tasks.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->

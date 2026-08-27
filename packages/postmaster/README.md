# @vielzeug/postmaster

Typed durable job outbox with leased processing, retries, and dead-letter recovery.

Postmaster coordinates delivery of application jobs that must survive reloads, resume later, retry according to an explicit policy, and retain terminal failures for recovery.

## Install

```sh
pnpm add @vielzeug/postmaster
```

For browser persistence, also install `@vielzeug/vault`:

```sh
pnpm add @vielzeug/postmaster @vielzeug/vault
```

## Usage

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
    retry: { maxAttempts: 5, shouldRetry: (error) => error instanceof TypeError },
  },
});

const store = createIndexedDbPostmasterStore({ name: 'my-app-outbox' });
const postmaster = createPostmaster({ jobs, store });

await postmaster.enqueue('createTodo', { id: crypto.randomUUID(), title: 'Buy milk' });
await postmaster.start();

// Delayed eligibility — the job persists now but cannot be claimed until `availableAt`:
await postmaster.enqueue('createTodo', { id: crypto.randomUUID(), title: 'Buy milk' }, {
  availableAt: Date.now() + 60_000,
});

// On page unload:
await postmaster.dispose();
await store.dispose();
```

## At-least-once delivery

Postmaster provides at-least-once delivery. Every job must derive a stable idempotency key, and handlers must send or otherwise enforce that key. Never assume exactly-once execution.

## Delayed eligibility

`enqueue()` accepts an optional `availableAt` timestamp. The job persists immediately but cannot be claimed before that time. Postmaster does not guarantee execution at `availableAt` — only that the job will not be claimed earlier. A live processor (`start()` or `flush()`) is required for execution; in a browser, a closed page or suspended service worker will run the job when the processor next becomes active. Past timestamps remain immediately eligible.

```ts
await postmaster.enqueue('sendDigest', { userId }, { availableAt: Date.now() + 60_000 });
```

## Entry points

| Import | Purpose |
| --- | --- |
| `@vielzeug/postmaster` | Job definitions, processor, store contract, events, errors |
| `@vielzeug/postmaster/indexeddb` | Durable browser store backed by Vault IndexedDB |
| `@vielzeug/postmaster/testing` | Deterministic in-memory store and test helpers |

## Testing

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

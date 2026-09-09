---
title: 'Postmaster Examples — Queue Offline Courier Requests'
description: Persist Courier requests through a Postmaster outbox so they survive reloads.
---

## Queue Offline Courier Requests

### Problem

A form submission must reach the server even if the user goes offline or reloads the page mid-request. Direct `fetch` calls lose the request; Courier alone does not persist retries.

### Solution

Wrap the Courier request in a Postmaster job. The job payload, idempotency key, and attempts persist in IndexedDB. Postmaster retries network failures and dead-letters terminal ones.

```ts
import { createCourier, CourierNetworkError } from '@vielzeug/courier';
import { createPostmaster, defineJobs } from '@vielzeug/postmaster';
import { createIndexedDbPostmasterStore } from '@vielzeug/postmaster/indexeddb';

const courier = createCourier({ baseUrl: 'https://api.example.com' });

const jobs = defineJobs({
  createTodo: {
    version: 1,
    validate: (v: unknown) => v as { id: string; title: string },
    key: (p) => p.id,
    execute: async (payload, { key, signal }) => {
      await courier.request('/todos', {
        method: 'POST',
        body: payload,
        headers: { 'Idempotency-Key': key },
        signal,
      });
    },
    retry: { maxAttempts: 10, shouldRetry: (error) => error instanceof CourierNetworkError },
  },
});

const store = createIndexedDbPostmasterStore({ name: 'todos-outbox' });
const postmaster = createPostmaster({ jobs, store });

export async function submitTodo(title: string): Promise<void> {
  await postmaster.enqueue('createTodo', { id: crypto.randomUUID(), title });
}

postmaster.start();

// On page unload:
// await postmaster.dispose();
// await store.dispose();
```

#### With a Custom Retry Delay

Use a fixed delay instead of Arsenal's default exponential backoff.

```ts
retry: {
  maxAttempts: 10,
  shouldRetry: (error) => error instanceof CourierNetworkError,
  delay: () => 5_000,
}
```

### Pitfalls

- Send the `Idempotency-Key` header so a repeated delivery does not create a duplicate todo.
- Do not enqueue jobs with unbounded payloads; IndexedDB records count toward origin storage quotas.
- Dispose the processor before the store; the processor does not own the store.

### Related

- [Courier Integration](/courier/)
- [Resume When Network Returns](./resume-when-network-returns.md)
- [API Reference](../api.md#createpostmaster)

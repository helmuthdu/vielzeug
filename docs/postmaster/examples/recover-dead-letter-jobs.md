---
title: 'Postmaster Examples — Recover Dead-Letter Jobs'
description: Inspect, retry, and remove jobs that exhausted retries or hit terminal failures.
---

## Recover Dead-Letter Jobs

### Problem

Jobs that exhaust retries or hit a terminal failure move to dead-letter. The application needs to inspect them, retry after a fix, or remove them permanently.

### Solution

List dead-letter jobs, inspect the bounded failure, and call `retry()` or `remove()`.

```ts
import { createPostmaster, defineJobs } from '@vielzeug/postmaster';
import { createIndexedDbPostmasterStore } from '@vielzeug/postmaster/indexeddb';

const store = createIndexedDbPostmasterStore({ name: 'outbox' });
const postmaster = createPostmaster({
  jobs: defineJobs({
    createTodo: {
      version: 1,
      validate: (v: unknown) => v as { id: string; title: string },
      key: (p) => p.id,
      execute: async (payload, { key, signal }) => {
        const res = await fetch('/api/todos', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Idempotency-Key': key },
          signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      },
    },
  }),
  store,
});

await postmaster.start();

// Later, inspect dead-letter jobs:
const deadLettered = await postmaster.list({ status: 'dead-letter' });

for (const entry of deadLettered) {
  console.log(entry.id, entry.name, entry.attempts, entry.failure);
}

// Retry a fixed job back into the queue:
const result = await postmaster.retry(deadLettered[0].id);
if (result.status === 'retried') {
  console.log('retried', result.entry.id);
} else {
  console.log('could not retry:', result.status);
}

// Or remove it permanently:
const removed = await postmaster.remove(deadLettered[0].id);
if (removed.status === 'removed') {
  console.log('removed', removed.id);
}
```

#### With Event-Driven Recovery

Subscribe to `dead-lettered` events to surface failures to the UI immediately.

```ts
const unsubscribe = postmaster.subscribe((event) => {
  if (event.type === 'dead-lettered') {
    showRecoveryPrompt(event.entry.id, event.entry.failure);
  }
});
```

### Pitfalls

- `retry()` only accepts dead-letter jobs; queued or running jobs return `not-dead-letter` or `running`.
- `remove()` rejects running jobs to avoid losing in-flight work.
- The stored `failure` contains only the error name, message, and timestamp; do not expect a stack trace or response body.

### Related

- [API Reference](../api.md#retry)
- [Queue Offline Courier Mutations](./queue-offline-courier-mutations.md)
- [Events](../api.md#postmasterevent)

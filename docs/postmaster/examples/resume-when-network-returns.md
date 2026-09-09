---
title: 'Postmaster Examples — Resume When Network Returns'
description: Flush the Postmaster outbox when Sentinel reports the network is back online.
---

## Resume When Network Returns

### Problem

Jobs enqueued while offline remain queued until the processor next claims them. The application should flush the outbox as soon as connectivity returns rather than waiting for the next scheduled wake.

### Solution

Subscribe to Sentinel's network state and call `flush()` when `online` becomes true. Postmaster does not import Sentinel; the integration lives in application code.

```ts
import { createNetwork } from '@vielzeug/sentinel';
import { createPostmaster, defineJobs } from '@vielzeug/postmaster';
import { createIndexedDbPostmasterStore } from '@vielzeug/postmaster/indexeddb';

const store = createIndexedDbPostmasterStore({ name: 'outbox' });
const postmaster = createPostmaster({
  jobs: defineJobs({
    sync: {
      version: 1,
      validate: (v: unknown) => v as { id: string },
      key: (p) => p.id,
      execute: async (payload, { key, signal }) => {
        await fetch(`/api/sync/${payload.id}`, {
          headers: { 'Idempotency-Key': key },
          signal,
        });
      },
      retry: { maxAttempts: 20, shouldRetry: (error) => error instanceof TypeError },
    },
  }),
  store,
});

const network = createNetwork();
const unsubscribe = network.subscribe(() => {
  if (network.getSnapshot().online) void postmaster.flush();
});

postmaster.start();

// On teardown:
// unsubscribe();
// network.dispose();
// await postmaster.dispose();
// await store.dispose();
```

### Pitfalls

- `navigator.onLine` is a hint, not proof that a request will succeed; keep `shouldRetry` defensive.
- `flush()` processes every available job synchronously; avoid calling it on every network event if the outbox is large.
- Dispose the Sentinel subscription before the Postmaster to avoid flushing after teardown.

### Related

- [Sentinel Network API](/sentinel/api#createnetwork)
- [Queue Offline Courier Mutations](./queue-offline-courier-mutations.md)
- [API Reference](../api.md#flush)

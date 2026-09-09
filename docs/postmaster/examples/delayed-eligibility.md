---
title: 'Postmaster Examples — Delayed Eligibility'
description: Persist a job now but defer its claimability with availableAt.
---

## Delayed Eligibility

### Problem

A job must survive reloads but should not run immediately — a digest, reminder, or cooldown. `setTimeout` loses the work on reload; a separate scheduler adds infrastructure.

### Solution

Pass `availableAt` to `enqueue()`. Postmaster persists the job immediately but will not claim it before the requested time. The same mechanism already backs retry delays, so no new state or store primitive is required.

```ts
import { createPostmaster, defineJobs } from '@vielzeug/postmaster';
import { createIndexedDbPostmasterStore } from '@vielzeug/postmaster/indexeddb';

const jobs = defineJobs({
  sendDigest: {
    version: 1,
    validate: (v) => v as { userId: string },
    key: (p) => `digest:${p.userId}`,
    execute: async (payload, { key, signal }) => {
      await fetch('/api/digest', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        signal,
      });
    },
  },
});

const store = createIndexedDbPostmasterStore({ name: 'postmaster-outbox' });
const postmaster = createPostmaster({ jobs, store });

// Persist now; claimable in one minute.
await postmaster.enqueue('sendDigest', { userId: 'u_123' }, { availableAt: Date.now() + 60_000 });
postmaster.start();

// On page unload:
// await postmaster.dispose();
// await store.dispose();
```

### Pitfalls

- Postmaster does not guarantee execution at `availableAt` — only that the job will not be claimed earlier. A closed browser page or suspended service worker runs the job when a processor is next active.
- Past timestamps remain immediately eligible; Postmaster does not clamp caller-supplied values.
- Keep idempotency keys stable. Delayed eligibility changes when a job may be claimed, not how often it may be delivered.

### Related

- [API Reference — enqueue()](../api.md#enqueue)
- [Service Worker Background Sync](./service-worker-background-sync.md)
- [Usage Guide — Delayed Eligibility](../usage.md#delayed-eligibility)

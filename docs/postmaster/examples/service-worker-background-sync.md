---
title: 'Postmaster Examples — Service Worker Background Sync'
description: Drive Postmaster flush from a Background Sync event so jobs attempt delivery while the page is closed.
---

## Service Worker Background Sync

### Problem

Jobs must attempt delivery while the page is closed, but Postmaster has no built-in service worker adapter. Background Sync has limited browser support, cannot preserve retry-delay scheduling, and requires application-owned registration and authentication.

### Solution

Use `flush()` inside a `sync` event handler — the application owns the service worker lifecycle. Postmaster does not ship the adapter; the recipe below is application code.

```ts
// sw.ts — bundled as your service worker entry
import { createPostmaster, defineJobs } from '@vielzeug/postmaster';
import { createIndexedDbPostmasterStore } from '@vielzeug/postmaster/indexeddb';

const jobs = defineJobs({
  createTodo: {
    version: 1,
    validate: (v) => v as { id: string; title: string },
    key: (p) => p.id,
    execute: async (payload, { key, signal }) => {
      await fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        signal,
      });
    },
    retry: {
      maxAttempts: 5,
      shouldRetry: (error) => error instanceof TypeError, // network errors only
    },
  },
});

self.addEventListener('sync', (event) => {
  if (event.tag !== 'postmaster:outbox') return;

  event.waitUntil(
    (async () => {
      const store = createIndexedDbPostmasterStore({ name: 'postmaster-outbox' });
      const postmaster = createPostmaster({ jobs, store });

      try {
        const result = await postmaster.flush();
        console.log('[postmaster] sync delivered:', result);
      } finally {
        await postmaster.dispose();
        await store.dispose();
      }
    })(),
  );
});
```

Register the sync tag from your page after enqueueing:

```ts
await postmaster.enqueue('createTodo', { id: crypto.randomUUID(), title: 'Buy milk' });

if ('serviceWorker' in navigator && 'SyncManager' in window) {
  const reg = await navigator.serviceWorker.ready;
  await reg.sync.register('postmaster:outbox');
}
```

### Pitfalls

- **Delayed retries are not honored by Background Sync.** If a job is rescheduled with a future `availableAt`, the sync event may fire before that time. The job will not be claimed until the page reopens or another sync event fires after the delay.
- **Service worker termination.** The browser may terminate the worker if `flush()` takes too long. Long-running jobs should use short leases and rely on at-least-once redelivery.
- **No Firefox/Safari support.** Use Sentinel-triggered `flush()` on page focus as the cross-browser fallback.
- **Authentication.** The service worker shares the page's cookie jar in most browsers, but token-based auth may require passing credentials via `postMessage` before the sync event fires.

### Related

- [Resume When Network Returns](./resume-when-network-returns.md)
- [Delayed Eligibility](./delayed-eligibility.md)
- [API Reference — flush()](../api.md#flush)

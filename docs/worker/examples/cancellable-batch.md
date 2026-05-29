---
title: 'Worker Examples — Cancellable Batch'
description: 'Cancellable Batch examples for worker.'
---

## Cancellable Batch

### Problem

You queue a batch of tasks into the worker pool and the user navigates away before they finish. Tasks that complete after teardown will try to update state that no longer exists — you need to cancel the entire batch.

### Solution

Use `AbortController` to cancel queued tasks when the user navigates away:

```ts
import { createWorker } from '@vielzeug/worker';

const pool = createWorker<string, string>(
  async (url) => {
    const r = await fetch(url);
    return r.text();
  },
  { concurrency: 4, timeout: 8000 },
);

function startBatch(urls: string[]) {
  const ac = new AbortController();

  const promise = Promise.allSettled(
    urls.map((url) =>
      pool.run(url, { signal: ac.signal }).catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          console.log(`Batch cancelled: ${url}`);
          return null;
        }
        console.error(`Failed to fetch ${url}:`, err);
        throw err;
      }),
    ),
  );

  return { result: promise, cancel: () => ac.abort() };
}

// Usage:
const batch = startBatch(['https://example.com/1', 'https://example.com/2']);
// User navigates away:
batch.cancel();
// Queued tasks will reject with AbortError
```

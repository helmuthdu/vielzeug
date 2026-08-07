---
title: Cancellable Batch
description: Cancel queued, waiting, and executing module-worker tasks together.
---

## Cancellable Batch

### Problem

Application input becomes obsolete before all worker tasks finish.

### Solution

Pass one signal to `batch()`. Aborting it cancels every operation, including active worker work.

```ts
import { batch, createWorker } from '@vielzeug/familiar';

const pool = createWorker<string, string>(new URL('./fetch.worker.ts', import.meta.url));
const controller = new AbortController();
const urls = ['https://example.com/a', 'https://example.com/b'];

const values = batch(pool, urls, { signal: controller.signal });
controller.abort();

try {
  for await (const value of values) console.log(value);
} finally {
  pool.dispose();
}
```

### Pitfalls

- Reuse one controller only for work that should share a lifetime.
- Catch `AbortError` separately from task failures.

### Related

- [Usage Guide](../usage.md)

---
title: 'Workit Examples — Cancellable Batch'
description: 'Cancellable Batch examples for workit.'
---

## Cancellable Batch

## Problem

Implement cancellable batch in a production-friendly way with `@vielzeug/workit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/workit` installed.

Use `AbortController` to cancel queued tasks when the user navigates away:

```ts
import { createWorker } from '@vielzeug/workit';

const pool = createWorker<string, string>(
  async (url) => {
    const r = await fetch(url);
    return r.text();
  },
  { concurrency: 4, timeout: 8000 },
);

function startBatch(urls: string[]) {
  const ac = new AbortController();

  const promise = Promise.all(
    urls.map((url) =>
      pool.run(url, { signal: ac.signal }).catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return null;
        throw err;
      }),
    ),
  );

  return { result: promise, cancel: () => ac.abort() };
}

// Usage
const batch = startBatch(urlList);
// User navigates away:
batch.cancel();
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Data Transformation Pipeline](./data-transformation-pipeline.md)
- [Fibonacci with Pool and Timeout](./fibonacci-with-pool-and-timeout.md)
- [Image Processing](./image-processing.md)

---
title: 'Fetchit Examples — Polling'
description: 'Polling examples for fetchit.'
---

## Polling

## Problem

Implement polling in a production-friendly way with `@vielzeug/fetchit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/fetchit` installed.

```ts
const qc = createQuery({ staleTime: 0 }); // always stale so each call hits the server

function startPolling(key: QueryKey, fn: QueryOptions<unknown>['fn'], intervalMs: number) {
  const tick = async () => {
    qc.invalidate(key);
    await qc.query({ key, fn }).catch(() => {});
  };
  tick();
  const id = setInterval(tick, intervalMs);
  return () => clearInterval(id);
}

const stopPolling = startPolling(
  ['job', jobId],
  ({ signal }) => api.get<Job>('/jobs/{id}', { params: { id: jobId }, signal }),
  3_000,
);

// Stop when job completes
qc.subscribe<Job>(['job', jobId], (state) => {
  if (state.data?.status === 'done') stopPolling();
});
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Authentication](./authentication.md)
- [CRUD Operations](./crud-operations.md)
- [Disposal](./disposal.md)

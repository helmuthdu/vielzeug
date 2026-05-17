---
title: 'Fetchit Examples — Polling'
description: 'Polling examples for fetchit.'
---

## Polling

### Problem

You need to refresh data on a fixed interval — showing the latest server state without WebSockets or server-sent events. The interval must pause when the component is destroyed.

### Solution

```ts
const qc = createQuery({ staleTime: 0 }); // always stale so each call hits the server

function startPolling<T>(key: QueryKey, fn: QueryOptions<T>['fn'], intervalMs: number) {
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


### Pitfalls

- Polling continues even when the browser tab is hidden, wasting bandwidth. Pause on `document.visibilitychange` and resume when the tab becomes visible again.
- The interval is measured from the start of each request, not from completion. If a request takes longer than the interval, the next fetch starts immediately with no idle gap.
- Failing to stop polling on component teardown causes fetch callbacks to fire on unmounted state. Always call `query.stopPolling()` in the cleanup function.

### Related
- [Signals (Stateit)](/stateit/examples/signals)

- [Authentication](./authentication.md)
- [CRUD Operations](./crud-operations.md)
- [Disposal](./disposal.md)

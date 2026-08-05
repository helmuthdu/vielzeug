---
title: 'Courier Examples — Polling'
description: 'Periodically refetch an explicit Courier cache entry.'
---

## Polling

### Problem

You need to keep a job view current and stop polling when view is disposed.

### Solution

Reuse one query definition. Pass `{ force: true }` from timer to bypass freshness window.

```ts
import { createCourier } from '@vielzeug/courier';

type Job = { id: string; status: 'complete' | 'running' };

const courier = createCourier({ baseUrl: 'https://api.example.com' });
const jobId = 'job-42';
const job = {
  key: ['job', jobId] as const,
  fetch: ({ signal }) => courier.get<Job>('/jobs/{id}', { params: { id: jobId }, signal }),
};

const timer = setInterval(() => void courier.queries.fetch(job, { force: true }), 3_000);
await courier.queries.fetch(job);

function dispose() {
  clearInterval(timer);
}
```

### Pitfalls

- Use `{ force: true }` for polling; `invalidate()` only marks query stale.
- Pause polling while UI is hidden when that matches product requirements.
- Avoid overlapping writes and refetches for same resource without application-level policy.

### Related

- [CRUD Operations](./crud-operations.md)
- [Disposal](./disposal.md)
- [Usage Guide](../usage.md#cached-queries)

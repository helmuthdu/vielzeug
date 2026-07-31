---
title: 'Courier Examples — Polling'
description: 'Periodically refetch an explicit Courier query handle.'
---

## Polling

### Problem

You need to keep a job view current and stop polling when the view is disposed.

### Solution

Call `refetch()` from a timer and release both the timer and subscriptions with the surrounding view.

```ts
import { createCourier } from '@vielzeug/courier';

type Job = { id: string; status: 'complete' | 'running' };

const courier = createCourier({ baseUrl: 'https://api.example.com' });
const jobId = 'job-42';
const job = courier.queries.create<Job>({
  key: ['job', jobId],
  fetch: ({ signal }) => courier.get('/jobs/{id}', { params: { id: jobId }, signal }),
});

const timer = setInterval(() => void job.refetch(), 3_000);
await job.fetch();

function dispose() {
  clearInterval(timer);
  job.dispose();
}
```

### Pitfalls

- Use `refetch()` for polling; `invalidate()` only marks a query stale.
- Pause polling while the UI is hidden when that matches your product requirements.
- Avoid overlapping writes and refetches for the same resource without an application-level policy.

### Related

- [CRUD Operations](./crud-operations.md)
- [Disposal](./disposal.md)
- [Usage Guide](../usage.md#query-handles)

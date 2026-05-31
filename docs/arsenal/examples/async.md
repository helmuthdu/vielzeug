---
title: Arsenal — Async Examples
description: Async utility examples for Arsenal.
---

## Async Utilities

## Quick Reference

- [abortable](./async/abortable.md)
- [parallel](./async/parallel.md)
- [queue](./async/queue.md)
- [retry](./async/retry.md)
- [sleep](./async/sleep.md)
- [timeout](./async/timeout.md)
- [waitFor](./async/waitFor.md)

## Common Patterns

```ts
import {
  abortable,
  exponentialBackoff,
  isAbortError,
  memo,
  parallel,
  queue,
  retry,
  sleep,
  waitFor,
} from '@vielzeug/arsenal';

// Bounded concurrent fan-out
const jobs = await parallel([1, 2, 3, 4], async (n) => n * 2, { limit: 3 });

// Sequential queue with concurrency cap
const q = queue({ concurrency: 2 });
const a = q.add(() => fetch('/api/a').then((r) => r.text()));
const b = q.add(() => fetch('/api/b').then((r) => r.text()));
await q.onIdle();

// Retry with per-attempt timeout and exponential backoff
const resilient = await retry(
  async (signal) => {
    const res = await fetch('/api/health', { signal });
    return res.json();
  },
  {
    times: 4,
    timeout: 5_000,
    delay: (failureIndex) => exponentialBackoff(failureIndex), // 1s, 2s, 4s, 8s
    shouldRetry: (err, failureIndex) => {
      // failureIndex is 0-based: 0 = first failure, 1 = second, …
      // Not called on the final (exhausting) attempt.
      return failureIndex < 3 && !(err instanceof TypeError);
    },
  },
);

// sleep that respects an AbortSignal
const controller = new AbortController();
await sleep(250, controller.signal);

// Poll until condition is true or timeout fires
await waitFor(() => document.querySelector('#app') !== null, { timeout: 3_000 });

// Memoize async functions — in-flight deduplication included
const fetchProfile = memo((id: number) => fetch(`/api/users/${id}`).then((r) => r.json()), {
  maxSize: 100,
  ttl: 60_000,
});
const [profileA, profileB] = await Promise.all([fetchProfile(1), fetchProfile(1)]);
// fetchProfile(1) is called exactly once — second call shares the in-flight Promise

// Abort a running promise
const abortController = new AbortController();
const cancellable = abortable(
  fetch('/api/cancel').then((r) => r.json()),
  abortController.signal,
);
abortController.abort();
try {
  await cancellable;
} catch (err) {
  if (isAbortError(err)) console.log('cancelled');
}

await Promise.all([a, b]);
console.log(jobs, resilient, profileA, profileB);
```

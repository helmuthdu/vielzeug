---
title: Arsenal — Async Examples
description: Async utility examples for Arsenal.
---

## Quick Reference

- [abortError](./async/abortError.md)
- [attempt](./async/attempt.md)
- [parallel](./async/parallel.md)
- [queue](./async/queue.md)
- [retry](./async/retry.md)
- [sleep](./async/sleep.md)
- [waitFor](./async/waitFor.md)

## Common Patterns

```ts
import { backoff, isAbortError, parallel, queue, retry, sleep, stash, waitFor } from '@vielzeug/arsenal';

// Bounded concurrent fan-out
const jobs = await parallel([1, 2, 3, 4], async (n) => n * 2, { limit: 3 });

// Sequential queue with concurrency cap
const q = queue({ concurrency: 2 });
const a = q.add(() => fetch('/api/a').then((r) => r.text()));
const b = q.add(() => fetch('/api/b').then((r) => r.text()));
await q.onIdle();

// Listen to every settled result
const unsub = q.onSettled((result) => {
  if (result.ok) console.log('done', result.value);
  else console.error('failed', result.error);
});
unsub(); // unsubscribe

// Retry with per-attempt timeout and exponential backoff
const resilient = await retry(
  async (signal) => {
    const res = await fetch('/api/health', { signal });
    return res.json();
  },
  {
    times: 4,
    timeout: 5_000,
    delay: (failureIndex) => backoff(failureIndex), // 1s, 2s, 4s, 8s
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

// Async caching with in-flight deduplication — use stash.getOrSet
const profileCache = stash<unknown>({ ttlMs: 60_000, maxSize: 100 });
const [profileA, profileB] = await Promise.all([
  profileCache.getOrSet('user:1', () => fetch('/api/users/1').then((r) => r.json())),
  profileCache.getOrSet('user:1', () => fetch('/api/users/1').then((r) => r.json())),
]);
// fetch is called exactly once — second getOrSet shares the in-flight Promise

// Abort a fetch directly via AbortSignal
const abortController = new AbortController();
const task = fetch('/api/slow', { signal: abortController.signal }).then((r) => r.json());
abortController.abort();
try {
  await task;
} catch (err) {
  if (isAbortError(err)) console.log('cancelled');
}

await Promise.all([a, b]);
console.log(jobs, resilient, profileA, profileB);
```

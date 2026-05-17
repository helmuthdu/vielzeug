---
title: Toolkit — Async Examples
description: Async utility examples for Toolkit.
---

## Async Utilities

## Quick Reference

- [abortable](./async/abortable.md)
- [attempt](./async/attempt.md)
- [defer](./async/defer.md)
- [parallel](./async/parallel.md)
- [queue](./async/queue.md)
- [retry](./async/retry.md)
- [scheduler](./async/scheduler.md)
- [sleep](./async/sleep.md)
- [timeout](./async/timeout.md)
- [waitFor](./async/waitFor.md)

## Common Patterns

```ts
import {
  abortable,
  attempt,
  defer,
  memo,
  parallel,
  queue,
  retry,
  sleep,
  timeout,
  waitFor,
} from '@vielzeug/toolkit';

const result = await attempt(
  async (signal) => {
    const res = await fetch('/api/user', { signal });
    return res.json();
  },
  { times: 2, timeout: 5_000 },
);

const jobs = await parallel([1, 2, 3, 4], async (n) => n * 2, { limit: 3 });

const q = queue({ concurrency: 2 });
const a = q.add(() => fetch('/api/a').then((r) => r.text()));
const b = q.add(() => fetch('/api/b').then((r) => r.text()));
await q.onIdle();

await sleep(250);
const delayed = await fetch('/api/fast').then((r) => r.text());

const resilient = await retry(() => fetch('/api/health').then((r) => r.json()), {
  times: 3,
  delay: 200,
});

await sleep(100);
await waitFor(() => document.querySelector('#app') !== null, { timeout: 3_000 });

const deferred = defer<string>();
setTimeout(() => deferred.resolve('done'), 50);
const value = await deferred.promise;

const fetchProfile = memo((id: number) => fetch(`/api/users/${id}`).then((r) => r.json()));

const [profileA, profileB] = await Promise.all([fetchProfile(1), fetchProfile(1)]);
const guarded = timeout(
  fetch('/api/slow').then((r) => r.json()),
  2_000,
);

const controller = new AbortController();
const cancellable = abortable(
  fetch('/api/cancel').then((r) => r.json()),
  controller.signal,
);
controller.abort(new Error('cancelled'));

await Promise.all([a, b]);
console.log(result, jobs, delayed, resilient, value, profileA, profileB, guarded, cancellable);
```

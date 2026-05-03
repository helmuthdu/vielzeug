---
title: Toolkit — Async Examples
description: Async utility examples for Toolkit.
---

# Async Utilities

## Quick Reference

- [attempt](./async/attempt.md)
- [defer](./async/defer.md)
- [parallel](./async/parallel.md)
- [queue](./async/queue.md)
- [race](./async/race.md)
- [retry](./async/retry.md)
- [scheduler](./async/scheduler.md)
- [sleep](./async/sleep.md)
- [waitFor](./async/waitFor.md)

## Common Patterns

```ts
import {
  attempt,
  defer,
  parallel,
  queue,
  race,
  retry,
  sleep,
  waitFor,
} from '@vielzeug/toolkit';

const result = await attempt(async (signal) => {
  const res = await fetch('/api/user', { signal });
  return res.json();
}, { times: 2, timeout: 5_000 });

const jobs = await parallel(3, [1, 2, 3, 4], async (n) => n * 2);

const q = queue({ concurrency: 2 });
const a = q.add(() => fetch('/api/a').then((r) => r.text()));
const b = q.add(() => fetch('/api/b').then((r) => r.text()));
await q.onIdle();

const delayed = await race(fetch('/api/fast').then((r) => r.text()), 250);

const resilient = await retry(() => fetch('/api/health').then((r) => r.json()), {
  times: 3,
  delay: 200,
});

await sleep(100);
await waitFor(() => document.querySelector('#app') !== null, { timeout: 3_000 });

const deferred = defer<string>();
setTimeout(() => deferred.resolve('done'), 50);
const value = await deferred.promise;

await Promise.all([a, b]);
console.log(result, jobs, delayed, resilient, value);
```

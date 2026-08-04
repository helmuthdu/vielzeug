---
title: Arsenal — Async Examples
description: Async utility examples for Arsenal.
---

## Quick Reference

- [abortError](./async/abortError.md)
- [attempt](./async/attempt.md)
- [parallel](./async/parallel.md)
- [taskPool](./async/queue.md)
- [retry](./async/retry.md)
- [sleep](./async/sleep.md)
- [waitFor](./async/waitFor.md)

## Common Patterns

```ts
import { parallel, retry, sleep, taskPool, waitFor } from '@vielzeug/arsenal/async';
import { cache } from '@vielzeug/arsenal/cache';

const jobs = await parallel([1, 2, 3, 4], async (value) => value * 2, { limit: 3 });

const pool = taskPool({ concurrency: 2 });
const responses = await Promise.all([
  pool.run((signal) => fetch('/api/a', { signal }).then((response) => response.json())),
  pool.run((signal) => fetch('/api/b', { signal }).then((response) => response.json())),
]);
await pool.idle();
pool.dispose();

const resilient = await retry(
  (signal) => fetch('/api/health', { signal }).then((response) => response.json()),
  { times: 4 },
);

const profiles = cache<string, unknown>({ ttlMs: 60_000 });
const profile = await profiles.getOrLoad('user:1', () => fetch('/api/users/1').then((response) => response.json()));

await sleep(250);
await waitFor(() => document.querySelector('#app') !== null, { timeout: 3_000 });

console.log(jobs, responses, resilient, profile);
```

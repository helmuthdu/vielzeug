---
title: 'Toolkit — Async Examples'
description: 'Async utility examples for Toolkit.'
---

# Async Utilities Examples

Comprehensive async/promise utilities for modern JavaScript applications.

## Overview

## Problem

Implement overview in a production-friendly way with `@vielzeug/toolkit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/toolkit` installed.

The async category provides utilities for managing promises, concurrency control, retries, timeouts, and other asynchronous patterns.

## attempt

Execute a function with retry + timeout handling and inspect the discriminated result.

```typescript
import { attempt } from '@vielzeug/toolkit';

const result = await attempt(
  async () => {
    if (Math.random() < 0.7) throw new Error('Random failure');

    return 'Success!';
  },
  {
    times: 3,
    timeout: 5000,
    onError: (err) => console.error('attempt failed', err),
  },
);

if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.error);
}
```

## defer

Create a promise with externally accessible resolve/reject methods.

```typescript
import { defer } from '@vielzeug/toolkit';

// Basic usage
const deferred = defer<string>();

setTimeout(() => {
  deferred.resolve('Done!');
}, 1000);

const result = await deferred.promise; // 'Done!'

// Event-based workflow
const eventPromise = defer<Event>();

element.addEventListener(
  'click',
  (e) => {
    eventPromise.resolve(e);
  },
  { once: true },
);

const clickEvent = await eventPromise.promise;
```

## delay

::: warning Removed
`delay` has been removed. Use `sleep` for a plain async wait, or `attempt` for delayed retries.
:::

## parallel

Process an array with controlled parallelism.

```typescript
import { parallel } from '@vielzeug/toolkit';

// Process 3 items at a time
const urls = ['url1', 'url2', 'url3', 'url4', 'url5'];

const results = await parallel(3, urls, async (url) => {
  const response = await fetch(url);
  return response.json();
});

// With AbortSignal
const controller = new AbortController();

const results = await parallel(5, items, async (item) => processItem(item), controller.signal);
```

## pool

Create a promise pool for rate limiting concurrent operations.

```typescript
import { pool } from '@vielzeug/toolkit';

// Create pool with max 3 concurrent requests
const requestPool = pool(3);

const results = await Promise.all([
  requestPool(() => fetch('/api/1')),
  requestPool(() => fetch('/api/2')),
  requestPool(() => fetch('/api/3')),
  requestPool(() => fetch('/api/4')), // Waits for a slot
  requestPool(() => fetch('/api/5')), // Waits for a slot
]);

// Reusable pool
const apiPool = pool(5);

async function fetchUser(id: number) {
  return apiPool(() => fetch(`/api/users/${id}`).then((r) => r.json()));
}
```

## predict

::: tip Internal utility
`predict` is not exported from the package index. It powers `attempt` internally. Use `attempt` for retry + timeout logic, or `race` for a minimum-delay guarantee.
:::

## queue

Create a task queue with concurrency control and monitoring.

```typescript
import { queue } from '@vielzeug/toolkit';

// Basic usage
const taskQueue = queue({ concurrency: 2 });

taskQueue.add(() => fetch('/api/1'));
taskQueue.add(() => fetch('/api/2'));
taskQueue.add(() => fetch('/api/3'));

// Wait for all tasks
await taskQueue.onIdle();

// Monitor queue
console.log(taskQueue.size); // Pending tasks
console.log(taskQueue.pending); // Currently running

// Clear remaining tasks
taskQueue.clear();

// Task queue with results
const results: string[] = [];

const q = queue({ concurrency: 3 });

for (const url of urls) {
  const result = await q.add(() => fetch(url).then((r) => r.text()));
  results.push(result);
}
```

## race

Race a promise against a guaranteed minimum delay — useful for preventing loading flicker.

```typescript
import { race } from '@vielzeug/toolkit';

// Show loading spinner for at least 500ms
const data = await race(fetchQuickData(), 500);

// Use case: Better UX
async function loadUserProfile(userId: string) {
  // Even if data loads in 50ms, show spinner for at least 300ms
  const user = await race(fetchUser(userId), 300);
  return user;
}
```

## retry

Retry async operations with exponential backoff.

```typescript
import { retry } from '@vielzeug/toolkit';

// Basic retry
const result = await retry(() => fetchData(), { times: 3, delay: 1000 });

// Exponential backoff
const result = await retry(() => unreliableAPICall(), {
  times: 5,
  delay: 500,
  backoff: 2, // 500ms, 1000ms, 2000ms, 4000ms
});

// Per-attempt delay override — supersedes delay and backoff
const result = await retry(() => fetchData(), {
  times: 5,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000), // 1s, 2s, 4s, 8s, capped at 30s
});

// Selective retry — return false to stop for a specific error type
const result = await retry(() => fetchData(), {
  times: 3,
  delay: 500,
  shouldRetry: (err, attempt) => {
    // Never retry client errors (4xx)
    if (err instanceof Response && err.status >= 400 && err.status < 500) return false;
    return true;
  },
});

// With AbortSignal
const controller = new AbortController();

const result = await retry(() => fetchData(), {
  times: 3,
  delay: 1000,
  signal: controller.signal,
});

// Custom backoff function
const result = await retry(() => fetchData(), {
  times: 4,
  delay: 1000,
  backoff: (attempt, delay) => delay * attempt, // Linear backoff
});
```

## scheduler

Schedule tasks at a given priority using the native [Prioritized Task Scheduling API](https://developer.mozilla.org/en-US/docs/Web/API/Prioritized_Task_Scheduling_API) with an automatic polyfill fallback.

`new Scheduler()` is the recommended constructor — it installs the polyfill just-in-time without polluting `globalThis` until first use. Call `polyfillScheduler()` once at your entry point if you prefer to install it globally upfront.

```typescript
import { Scheduler, polyfillScheduler } from '@vielzeug/toolkit';

// Basic delayed task
const scheduler = new Scheduler();
await scheduler.postTask(() => console.log('hello'), { delay: 100 });

// Background priority — runs after higher-priority work, ideal for cache cleanup
await scheduler.postTask(() => pruneStaleCacheEntries(), {
  delay: 5 * 60_000,
  priority: 'background',
});

// Cancellable task
const controller = new AbortController();

void scheduler
  .postTask(() => doExpensiveWork(), {
    delay: 2000,
    priority: 'background',
    signal: controller.signal,
  })
  .catch(() => {
    // AbortError — task was cancelled before it ran
  });

controller.abort(); // cancel it

// Global polyfill installation (safe to call multiple times)
polyfillScheduler();
await globalThis.scheduler.postTask(() => doWork(), { priority: 'background' });
```

## sleep

Create a promise that resolves after a specified time.

```typescript
import { sleep } from '@vielzeug/toolkit';

// Basic usage
await sleep(1000); // Wait 1 second
console.log('Done waiting');

// In async workflows
async function processWithDelay() {
  console.log('Starting...');
  await sleep(2000);
  console.log('Processing...');
  await sleep(1000);
  console.log('Done!');
}

// Rate limiting
for (const item of items) {
  await processItem(item);
  await sleep(100); // 100ms between each item
}
```

## waitFor

Poll for a condition to become true.

```typescript
import { waitFor } from '@vielzeug/toolkit';

// Wait for DOM element
await waitFor(() => document.querySelector('#myElement') !== null, { timeout: 5000, interval: 100 });

// Wait for API to be ready
await waitFor(
  async () => {
    try {
      const res = await fetch('/api/health');
      return res.ok;
    } catch {
      return false;
    }
  },
  { timeout: 30000, interval: 1000 },
);

// Wait for condition with cleanup
const controller = new AbortController();

setTimeout(() => controller.abort(), 10000);

await waitFor(() => window.myGlobal !== undefined, {
  timeout: 15000,
  interval: 200,
  signal: controller.signal,
});
```

## Real-World Examples

### API Request with Retry and Timeout

```typescript
import { attempt } from '@vielzeug/toolkit';

async function fetchWithRetry(url: string) {
  const result = await attempt(
    async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      return res.json();
    },
    { times: 3, timeout: 10_000 },
  );

  if (!result.ok) throw result.error;

  return result.value;
}
```

### Batch Processing with Rate Limiting

```typescript
import { pool, sleep } from '@vielzeug/toolkit';

async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  { batchSize = 10, delayBetweenBatches = 1000, concurrency = 3 } = {},
) {
  const requestPool = pool(concurrency);
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchResults = await Promise.all(batch.map((item) => requestPool(() => processor(item))));

    results.push(...batchResults);

    if (i + batchSize < items.length) {
      await sleep(delayBetweenBatches);
    }
  }

  return results;
}
```

### Task Queue with Progress Tracking

```typescript
import { queue } from '@vielzeug/toolkit';

async function processTasksWithProgress<T>(
  tasks: Array<() => Promise<T>>,
  onProgress?: (completed: number, total: number) => void,
) {
  const taskQueue = queue({ concurrency: 5 });
  const results: T[] = [];
  let completed = 0;

  for (const task of tasks) {
    taskQueue.add(async () => {
      const result = await task();
      results.push(result);
      completed++;
      onProgress?.(completed, tasks.length);
    });
  }

  await taskQueue.onIdle();
  return results;
}
```

### Polling with Timeout

```typescript
import { waitFor } from '@vielzeug/toolkit';

async function waitForJobCompletion(jobId: string) {
  await waitFor(
    async () => {
      const status = await fetch(`/api/jobs/${jobId}`).then((r) => r.json());
      return status.completed === true;
    },
    { timeout: 60000, interval: 2000 },
  );

  return fetch(`/api/jobs/${jobId}/result`).then((r) => r.json());
}
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Array Examples](./array.md)
- [Date Examples](./date.md)
- [Function Examples](./function.md)

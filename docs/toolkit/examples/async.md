# Async Utilities Examples

Comprehensive async/promise utilities for modern JavaScript applications.

## Overview

The async category provides utilities for managing promises, concurrency control, retries, timeouts, and other asynchronous patterns.

## attempt

Execute a function with advanced error handling and retry logic.

```typescript
import { attempt } from '@vielzeug/toolkit';

// Basic usage
const unreliableFunction = async () => {
  if (Math.random() < 0.7) throw new Error('Random failure');
  return 'Success!';
};

const result = await attempt(unreliableFunction, {
  retries: 3,
  timeout: 5000,
  silent: false,
});

// With identifier for logging
await attempt(fetchUserData, {
  identifier: 'fetchUserData',
  retries: 5,
  timeout: 10000,
});
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

Delay the execution of a function by a specified time.

```typescript
import { delay } from '@vielzeug/toolkit';

// Basic usage
const log = () => console.log('Hello, world!');
delay(log, 1000); // Logs after 1 second

// With async function
const fetchData = async () => fetch('/api/data');
const result = await delay(fetchData, 500);

// Custom delay
await delay(() => processData(), 2000);
```

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

Add timeout to async operations with AbortSignal support.

```typescript
import { predict } from '@vielzeug/toolkit';

// Basic usage
const result = await predict(
  async (signal) => {
    const response = await fetch('/api/data', { signal });
    return response.json();
  },
  { timeout: 5000 },
);

// With custom AbortSignal
const controller = new AbortController();

const result = await predict(async (signal) => longRunningTask(signal), { timeout: 10000, signal: controller.signal });

// Combine with retry
import { retry } from '@vielzeug/toolkit';

const result = await retry(() => predict((signal) => fetchData(signal), { timeout: 5000 }), { times: 3, delay: 1000 });
```

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

Race promises with a guaranteed minimum delay (better UX for loading states).

```typescript
import { race } from '@vielzeug/toolkit';

// Show loading spinner for at least 500ms
const data = await race(fetchQuickData(), 500);

// Prevents flickering for fast operations
const result = await race(
  [fetch('/api/1'), fetch('/api/2')],
  1000, // Ensure at least 1 second
);

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
  backoff: 2, // 500ms, 1000ms, 2000ms, 4000ms, 8000ms
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
import { retry, predict } from '@vielzeug/toolkit';

async function fetchWithRetry(url: string) {
  return retry(
    () =>
      predict(
        async (signal) => {
          const response = await fetch(url, { signal });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        },
        { timeout: 5000 },
      ),
    { times: 3, delay: 1000, backoff: 2 },
  );
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

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-~0.8KB-success" alt="Size">
</div>

# parallel

Process an array with an async callback with controlled parallelism. Similar to Promise.all, but limits how many items are processed concurrently.

## Signature

```typescript
function parallel<T, R>(
  array: T[],
  callback: (item: T, index: number, array: T[]) => Promise<R>,
  options?: { limit?: number; signal?: AbortSignal },
): Promise<R[]>;
```

## Parameters

- `array` – Array of items to process
- `callback` – Async function to process each item
- `options.limit` – Maximum number of concurrent operations (defaults to array length)
- `options.signal` – Optional AbortSignal to cancel processing

## Returns

Promise resolving to an ordered array of results.

## Examples

### Basic Usage

```typescript
import { parallel } from '@vielzeug/toolkit';
const urls = ['url1', 'url2', 'url3', 'url4', 'url5'];
// Process 3 URLs at a time
const results = await parallel(urls, async (url) => {
  const response = await fetch(url);
  return response.json();
}, { limit: 3 });
console.log(results); // Array of JSON responses in order
```

### With AbortSignal

```typescript
import { parallel } from '@vielzeug/toolkit';
const controller = new AbortController();
// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);
try {
  const results = await parallel(items, async (item) => processItem(item), {
    limit: 2,
    signal: controller.signal,
  });
} catch (error) {
  console.log('Processing aborted');
}
```

### Rate Limiting API Calls

```typescript
import { parallel } from '@vielzeug/toolkit';
const userIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
// Fetch users with max 3 concurrent requests
const users = await parallel(userIds, async (id) => {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}, { limit: 3 });
```

### With Index and Array Parameters

```typescript
import { parallel, sleep } from '@vielzeug/toolkit';
const items = ['a', 'b', 'c', 'd', 'e'];
const results = await parallel(items, async (item, index, array) => {
  console.log(`Processing ${item} (${index + 1}/${array.length})`);
  await sleep(100);
  return item.toUpperCase();
}, { limit: 2 });
console.log(results); // ['A', 'B', 'C', 'D', 'E']
```

## Related

- [queue](./queue.md) – Task queue with monitoring

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-~0.8KB-success" alt="Size">
</div>

# parallel

Process an array with an async callback with controlled parallelism. Similar to Promise.all, but limits how many items are processed concurrently.

## Signature

```typescript
function parallel<T, R>(
  limit: number,
  array: T[],
  callback: (item: T, index: number, array: T[]) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]>;
```

## Parameters

- `limit` – Maximum number of concurrent operations (must be >= 1)
- `array` – Array of items to process
- `callback` – Async function to process each item
- `signal` – Optional AbortSignal to cancel processing

## Returns

Promise resolving to an ordered array of results.

## Examples

### Basic Usage

```typescript
import { parallel } from '@vielzeug/toolkit';
const urls = ['url1', 'url2', 'url3', 'url4', 'url5'];
// Process 3 URLs at a time
const results = await parallel(3, urls, async (url) => {
  const response = await fetch(url);
  return response.json();
});
console.log(results); // Array of JSON responses in order
```

### With AbortSignal

```typescript
import { parallel } from '@vielzeug/toolkit';
const controller = new AbortController();
// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);
try {
  const results = await parallel(2, items, async (item) => processItem(item), controller.signal);
} catch (error) {
  console.log('Processing aborted');
}
```

### Rate Limiting API Calls

```typescript
import { parallel } from '@vielzeug/toolkit';
const userIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
// Fetch users with max 3 concurrent requests
const users = await parallel(3, userIds, async (id) => {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
});
```

### With Index and Array Parameters

```typescript
import { parallel } from '@vielzeug/toolkit';
const items = ['a', 'b', 'c', 'd', 'e'];
const results = await parallel(2, items, async (item, index, array) => {
  console.log(`Processing ${item} (${index + 1}/${array.length})`);
  await delay(100);
  return item.toUpperCase();
});
console.log(results); // ['A', 'B', 'C', 'D', 'E']
```

## Related

- [pool](./pool.md) – Generic promise pooling for rate limiting
- [queue](./queue.md) – Task queue with monitoring

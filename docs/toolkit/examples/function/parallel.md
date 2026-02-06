<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-2100_B-success" alt="Size">
</div>

# parallel

Processes an array with an async callback with controlled parallelism. Similar to `Promise.all`, but limits how many items are processed concurrently. Returns an ordered array of results.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/function/parallel.ts
:::

## Features

- **Controlled Concurrency**: Limit how many items process simultaneously
- **Ordered Results**: Results maintain original array order
- **Abort Support**: Can be cancelled via AbortSignal
- **Error Propagation**: Stops and throws on first error
- **Type-Safe**: Full TypeScript support with generics
- **Efficient**: Optimal for rate-limited APIs or resource constraints

## API

```ts
function parallel<T, R>(
  limit: number,
  array: T[],
  callback: (item: T, index: number, array: T[]) => Promise<R>,
  signal?: AbortSignal
): Promise<R[]>
```

### Parameters

- `limit`: Maximum number of concurrent operations (must be >= 1)
- `array`: Array of items to process
- `callback`: Async function to process each item
  - `item`: Current array item
  - `index`: Current index
  - `array`: Original array
- `signal`: Optional AbortSignal to cancel processing

### Returns

- Promise resolving to ordered array of results

### Throws

- `Error`: If limit is less than 1
- `DOMException`: If aborted via signal
- Any error thrown by the callback

## Examples

### Basic Parallel Processing

```ts
import { parallel } from '@vielzeug/toolkit';

const numbers = [1, 2, 3, 4, 5];

// Process 2 items at a time
const results = await parallel(2, numbers, async (n) => {
  return n * 2;
});
// [2, 4, 6, 8, 10]
```

### API Rate Limiting

```ts
import { parallel } from '@vielzeug/toolkit';

const urls = [
  'https://api.example.com/user/1',
  'https://api.example.com/user/2',
  'https://api.example.com/user/3',
  // ... 100 more URLs
];

// Fetch only 5 requests at a time to respect rate limits
const users = await parallel(5, urls, async (url) => {
  const response = await fetch(url);
  return response.json();
});

console.log(`Fetched ${users.length} users`);
```

### Image Processing with Concurrency Control

```ts
import { parallel } from '@vielzeug/toolkit';

const imageFiles = ['img1.jpg', 'img2.jpg', 'img3.jpg', /* ... */];

// Process 3 images at a time to avoid memory issues
const processedImages = await parallel(3, imageFiles, async (filename) => {
  const image = await loadImage(filename);
  const resized = await resizeImage(image, { width: 800 });
  const optimized = await optimizeImage(resized);
  return optimized;
});
```

### Database Batch Operations

```ts
import { parallel } from '@vielzeug/toolkit';

const userIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Update 2 records at a time to avoid database overload
const updates = await parallel(2, userIds, async (userId) => {
  return await db.users.update({
    where: { id: userId },
    data: { lastSeen: new Date() }
  });
});

console.log(`Updated ${updates.length} users`);
```

### With Abort Signal

```ts
import { parallel } from '@vielzeug/toolkit';

const controller = new AbortController();
const items = Array.from({ length: 100 }, (_, i) => i);

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  const results = await parallel(
    10,
    items,
    async (item) => {
      await processItem(item);
      return item;
    },
    controller.signal
  );
  
  console.log('Completed:', results.length);
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Processing was cancelled');
  }
}
```

### File Upload with Progress

```ts
import { parallel } from '@vielzeug/toolkit';

const files = [/* File objects */];
let completed = 0;

const uploadedFiles = await parallel(3, files, async (file, index) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/upload', {
    method: 'POST',
    body: formData
  });
  
  completed++;
  console.log(`Progress: ${completed}/${files.length}`);
  
  return response.json();
});
```

### Error Handling

```ts
import { parallel } from '@vielzeug/toolkit';

const items = [1, 2, 3, 4, 5];

try {
  const results = await parallel(2, items, async (n) => {
    if (n === 3) {
      throw new Error('Processing failed at item 3');
    }
    return n * 2;
  });
} catch (error) {
  console.error('Parallel processing failed:', error.message);
  // Error propagates immediately, stops further processing
}
```

### Sequential Processing (limit = 1)

```ts
import { parallel } from '@vielzeug/toolkit';

const tasks = ['task1', 'task2', 'task3'];

// Process one at a time (sequential)
const results = await parallel(1, tasks, async (task) => {
  console.log(`Starting ${task}`);
  await performTask(task);
  console.log(`Completed ${task}`);
  return `${task}-result`;
});

// Output:
// Starting task1
// Completed task1
// Starting task2
// Completed task2
// Starting task3
// Completed task3
```

### Large Dataset Processing

```ts
import { parallel } from '@vielzeug/toolkit';

// Process 1000 records with controlled parallelism
const records = await fetchRecords(); // 1000 items

const processed = await parallel(20, records, async (record) => {
  // Each record takes ~100ms to process
  const validated = await validateRecord(record);
  const enriched = await enrichData(validated);
  const saved = await saveToDatabase(enriched);
  return saved;
});

// With 20 parallel workers, processes in ~5 seconds
// vs 100 seconds if sequential
console.log(`Processed ${processed.length} records`);
```

### Web Scraping with Respect

```ts
import { parallel } from '@vielzeug/toolkit';

const urls = [/* 100 URLs to scrape */];

// Only 2 concurrent requests to be respectful
const scrapedData = await parallel(2, urls, async (url, index) => {
  console.log(`Scraping ${index + 1}/${urls.length}: ${url}`);
  
  const response = await fetch(url);
  const html = await response.text();
  const data = parseHTML(html);
  
  // Add delay between requests
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return data;
});
```

## Implementation Notes

- **Order Preserved**: Results array matches input array order exactly
- **Error Stops All**: First error stops processing and rejects the promise
- **Abort Stops All**: Abort signal stops all workers immediately
- **Worker Pool**: Creates only as many workers as needed (min of limit and array length)
- **No Memory Leak**: Workers complete and are garbage collected
- **Index Tracking**: Uses shared index counter to distribute work
- **Compared to Promise.all**:
  - `Promise.all`: Runs all promises simultaneously
  - `parallel`: Controls concurrency with a limit

## Performance Tips

- **Choose limit wisely**: 
  - Too low = slow processing
  - Too high = resource exhaustion
  - Good defaults: 5-20 for I/O, 2-4 for CPU-intensive
- **Monitor resources**: Watch memory, CPU, network when tuning
- **Add delays**: For API rate limiting, add delays in callback
- **Use abort**: Long-running operations should support cancellation

## See Also

- [map](../array/map.md): Transform array (async supported)
- [retry](./retry.md): Retry failed operations
- [attempt](./attempt.md): Try async operations with error handling
- [debounce](./debounce.md): Debounce function calls
- [throttle](./throttle.md): Throttle function calls

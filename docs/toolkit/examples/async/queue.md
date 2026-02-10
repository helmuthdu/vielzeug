<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-~0.9KB-success" alt="Size">
</div>

# queue

Create a task queue that processes promises sequentially with optional concurrency limit.

## Signature

```typescript
function queue(options?: { concurrency?: number }): {
  add: <T>(fn: () => Promise<T>) => Promise<T>;
  onIdle: () => Promise<void>;
  clear: () => void;
  size: number;
  pending: number;
};
```

## Parameters

- `options.concurrency` - Maximum number of concurrent promises (default: 1)

## Returns

Queue instance with:

- `add` - Add a task to the queue
- `onIdle` - Returns a promise that resolves when queue becomes idle
- `clear` - Clear all pending tasks
- `size` - Number of pending tasks
- `pending` - Number of currently running tasks

## Examples

### Basic Usage

```typescript
import { queue } from '@vielzeug/toolkit';
const taskQueue = queue({ concurrency: 2 });
taskQueue.add(() => fetch('/api/1'));
taskQueue.add(() => fetch('/api/2'));
taskQueue.add(() => fetch('/api/3'));
await taskQueue.onIdle(); // Wait for all tasks to complete
console.log('All tasks done!');
```

### With Results

```typescript
import { queue } from '@vielzeug/toolkit';
const taskQueue = queue({ concurrency: 3 });
const results: string[] = [];
for (const url of urls) {
  const result = await taskQueue.add(() => fetch(url).then((r) => r.text()));
  results.push(result);
}
console.log('All results:', results);
```

### Monitoring Queue

```typescript
import { queue } from '@vielzeug/toolkit';
const taskQueue = queue({ concurrency: 5 });
// Add tasks
urls.forEach((url) => {
  taskQueue.add(() => fetch(url));
});
// Monitor progress
const interval = setInterval(() => {
  console.log(`Pending: ${taskQueue.size}, Running: ${taskQueue.pending}`);
  if (taskQueue.size === 0 && taskQueue.pending === 0) {
    clearInterval(interval);
  }
}, 1000);
await taskQueue.onIdle();
```

### Clearing Queue

```typescript
import { queue } from '@vielzeug/toolkit';
const taskQueue = queue({ concurrency: 2 });
// Add many tasks
for (let i = 0; i < 100; i++) {
  taskQueue.add(() => processItem(i));
}
// User cancels
if (userCancelled) {
  taskQueue.clear(); // Clear remaining pending tasks
  console.log('Queue cleared');
}
```

### Sequential Processing

```typescript
import { queue } from '@vielzeug/toolkit';
// Concurrency of 1 = sequential processing
const sequentialQueue = queue({ concurrency: 1 });
const operations = [() => updateDatabase(), () => sendNotification(), () => logActivity()];
for (const operation of operations) {
  await sequentialQueue.add(operation);
  console.log('Operation completed');
}
```

## Related

- [pool](./pool.md) - Generic promise pooling
- [parallel](./parallel.md) - Array processing with concurrency

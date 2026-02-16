<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-~0.1KB-success" alt="Size">
</div>

# sleep

Create a Promise that resolves after a specified amount of time.

## Signature

```typescript
function sleep(timeout: number): Promise<void>;
```

## Parameters

- `timeout` – The number of milliseconds to wait before resolving the Promise

## Returns

A Promise that resolves after the specified time.

## Examples

### Basic Usage

```typescript
import { sleep } from '@vielzeug/toolkit';
await sleep(1000);
console.log('Waited 1 second');
```

### In Async Workflows

```typescript
import { sleep } from '@vielzeug/toolkit';
async function processWithDelay() {
  console.log('Starting...');
  await sleep(2000);
  console.log('Processing...');
  await sleep(1000);
  console.log('Done!');
}
```

### Rate Limiting

```typescript
import { sleep } from '@vielzeug/toolkit';
for (const item of items) {
  await processItem(item);
  await sleep(100); // 100ms between each item
}
```

### Polling with Delay

```typescript
import { sleep } from '@vielzeug/toolkit';
async function pollUntilReady() {
  while (true) {
    const status = await checkStatus();
    if (status === 'ready') break;
    console.log('Not ready yet, waiting...');
    await sleep(1000);
  }
  console.log('Ready!');
}
```

### Simulating Async Operations

```typescript
import { sleep } from '@vielzeug/toolkit';
async function mockAPICall() {
  await sleep(500); // Simulate network delay
  return { data: 'mock data' };
}
```

## Related

- [delay](./delay.md) – Delay function execution
- [waitFor](./waitFor.md) – Poll for a condition

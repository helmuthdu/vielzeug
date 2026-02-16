<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-~0.4KB-success" alt="Size">
</div>

# predict

Add timeout to async operations with AbortSignal support. Creates a Promise that can be aborted using an AbortController.

## Signature

```typescript
function predict<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options?: {
    signal?: AbortSignal;
    timeout?: number;
  },
): Promise<T>;
```

## Parameters

- `fn` – The function to execute, which receives an AbortSignal
- `options.signal` – The AbortSignal to use for aborting the Promise
- `options.timeout` – The timeout in milliseconds after which the Promise will be aborted (default: 7000)

## Returns

A Promise that resolves with the result of the callback or rejects if aborted.

## Examples

### Basic Usage

```typescript
import { predict } from '@vielzeug/toolkit';
const result = await predict(
  async (signal) => {
    const response = await fetch('/api/data', { signal });
    return response.json();
  },
  { timeout: 5000 },
);
```

### With Custom AbortSignal

```typescript
import { predict } from '@vielzeug/toolkit';
const controller = new AbortController();
const result = await predict(async (signal) => longRunningTask(signal), { timeout: 10000, signal: controller.signal });
// Can abort from outside
controller.abort();
```

### Combined with Retry

```typescript
import { predict, retry } from '@vielzeug/toolkit';
const result = await retry(
  () =>
    predict(
      async (signal) => {
        const response = await fetch('/api/data', { signal });
        if (!response.ok) throw new Error('Request failed');
        return response.json();
      },
      { timeout: 5000 },
    ),
  { times: 3, delay: 1000 },
);
```

### Cancellable Operation

```typescript
import { predict } from '@vielzeug/toolkit';
const controller = new AbortController();
// Start operation
const promise = predict(
  async (signal) => {
    for (let i = 0; i < 100; i++) {
      if (signal.aborted) break;
      await processChunk(i);
    }
    return 'Done';
  },
  { timeout: 30000, signal: controller.signal },
);
// User clicks cancel button
cancelButton.onclick = () => controller.abort();
try {
  const result = await promise;
} catch (error) {
  console.log('Operation cancelled');
}
```

## Related

- [retry](./retry.md) – Retry with exponential backoff
- [attempt](./attempt.md) – Execute with error handling and retry

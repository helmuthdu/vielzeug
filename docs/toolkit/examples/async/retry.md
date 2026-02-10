<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-~0.6KB-success" alt="Size">
</div>

# retry

Retry an asynchronous function with exponential backoff on failure.

## Signature

```typescript
function retry<T>(
  fn: () => Promise<T>,
  options?: {
    times?: number;
    delay?: number;
    backoff?: number | ((attempt: number, delay: number) => number);
    signal?: AbortSignal;
  },
): Promise<T>;
```

## Parameters

- `fn` - The asynchronous function to retry
- `options.times` - The number of retry attempts (default: 3)
- `options.delay` - The delay in milliseconds between retries (default: 250)
- `options.backoff` - Exponential backoff factor or custom function (default: 1, no backoff)
- `options.signal` - AbortSignal to allow canceling retries

## Returns

The result of the asynchronous function.

## Examples

### Basic Usage

```typescript
import { retry } from '@vielzeug/toolkit';
const result = await retry(() => fetchData(), { times: 3, delay: 1000 });
```

### Exponential Backoff

```typescript
import { retry } from '@vielzeug/toolkit';
const result = await retry(() => unreliableAPICall(), {
  times: 5,
  delay: 500,
  backoff: 2, // Delays: 500ms, 1000ms, 2000ms, 4000ms, 8000ms
});
```

### With AbortSignal

```typescript
import { retry } from '@vielzeug/toolkit';
const controller = new AbortController();
const result = await retry(() => fetchData(), {
  times: 3,
  delay: 1000,
  signal: controller.signal,
});
// Can abort from outside
controller.abort();
```

### Custom Backoff Function

```typescript
import { retry } from '@vielzeug/toolkit';
const result = await retry(() => fetchData(), {
  times: 4,
  delay: 1000,
  backoff: (attempt, delay) => delay * attempt, // Linear backoff
});
```

### Robust API Call

```typescript
import { retry } from '@vielzeug/toolkit';
async function fetchWithRetry(url: string) {
  return retry(
    async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    },
    {
      times: 3,
      delay: 1000,
      backoff: 2,
    },
  );
}
```

## Related

- [attempt](./attempt.md) - Execute with error handling and retry
- [predict](./predict.md) - Add timeout with AbortSignal

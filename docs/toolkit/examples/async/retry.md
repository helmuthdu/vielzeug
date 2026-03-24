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
    retryDelay?: (attempt: number) => number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    signal?: AbortSignal;
  },
): Promise<T>;
```

## Parameters

- `fn` – The asynchronous function to retry
- `options.times` – Total number of attempts including the first (default: `3`)
- `options.delay` – Delay in milliseconds between retries (default: `250`). Ignored when `retryDelay` is provided
- `options.backoff` – Exponential backoff factor or custom function (default: `1`, no backoff). Ignored when `retryDelay` is provided
- `options.retryDelay` – Per-attempt delay function. `attempt` is 0-based (0 = before the 2nd try). Supersedes `delay` and `backoff`
- `options.shouldRetry` – Return `false` to stop retrying for a specific error. `attempt` is the 0-based failure count
- `options.signal` – `AbortSignal` to cancel retries; throws the signal's `reason` on abort

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
  backoff: 2, // Delays: 500ms, 1000ms, 2000ms, 4000ms
});
```

### Per-Attempt Delay Override (`retryDelay`)

Use `retryDelay` for full control over each inter-attempt delay. It supersedes `delay` and `backoff`.

```typescript
import { retry } from '@vielzeug/toolkit';

// Capped exponential backoff: 1s, 2s, 4s, 8s (max 30s)
const result = await retry(() => fetchData(), {
  times: 5,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
});
```

### Selective Retry with `shouldRetry`

Return `false` to abort retries for a specific error type.

```typescript
import { retry } from '@vielzeug/toolkit';

const result = await retry(() => fetchUser(id), {
  times: 3,
  delay: 500,
  // Never retry 4xx client errors — only retry 5xx / network failures
  shouldRetry: (err, attempt) => {
    if (err instanceof Response && err.status >= 400 && err.status < 500) return false;
    return true;
  },
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
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      shouldRetry: (err) => !(err instanceof Error && err.message.startsWith('HTTP 4')),
    },
  );
}
```

## Related

- [attempt](./attempt.md) – Execute with error handling and retry

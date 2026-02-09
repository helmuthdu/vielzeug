<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-484_B-success" alt="Size">
</div>

# retry

The `retry` utility automatically re-executes an asynchronous function if it fails. It features customizable retry attempts, configurable delays, exponential backoff, and full support for `AbortSignal` to cancel pending retries.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/function/retry.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Exponential Backoff**: Gradually increase delay between attempts to reduce system load.
- **Abortable**: Integration with `AbortSignal` for clean cancellation.
- **Type-safe**: Properly infers the return type of the retried function.

## API

```ts
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

### Parameters

- `fn`: The asynchronous function to execute.
- `options`: Optional configuration:
  - `times`: Total number of attempts (defaults to `3`).
  - `delay`: Initial wait time in milliseconds between retries (defaults to `250`).
  - `backoff`: Multiplier for the delay after each failure (defaults to `1`, meaning no backoff). Can also be a function `(attempt: number, delay: number) => number` for custom backoff strategies.
  - `signal`: An `AbortSignal` to cancel the retry loop.

### Returns

- A Promise that resolves with the value from `fn`.
- Rejects with the last error if all attempts fail, or an `AbortError` if cancelled.

## Examples

### Basic Network Retry

```ts
import { retry } from '@vielzeug/toolkit';

const data = await retry(
  async () => {
    const response = await fetch('/api/stats');
    if (!response.ok) throw new Error('Failed');
    return response.json();
  },
  { times: 5, delay: 1000 },
);
```

### With Exponential Backoff

```ts
import { retry } from '@vielzeug/toolkit';

// Delay sequence: 500ms, 1000ms, 2000ms...
await retry(heavyTask, {
  times: 3,
  delay: 500,
  backoff: 2,
});
```

### With Custom Backoff Function

```ts
import { retry } from '@vielzeug/toolkit';

// Custom backoff strategy
await retry(apiCall, {
  times: 5,
  delay: 100,
  backoff: (attempt, currentDelay) => {
    // Fibonacci-like backoff
    return currentDelay + attempt * 100;
  },
});
```

## Implementation Notes

- Performance-optimized retry loop using `await sleep()`.
- If the `signal` is aborted, any pending delay is cleared immediately.
- Throws `TypeError` if `fn` is not a function.

## See Also

- [predict](./predict.md): Wait for a condition to become true.
- [sleep](./sleep.md): Pause execution for a specified duration.
- [debounce](./debounce.md): Rate-limit function execution.

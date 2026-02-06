<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-212_B-success" alt="Size">
</div>

# predict

The `predict` utility creates a Promise that can be aborted using an `AbortController`. It allows you to set a timeout for asynchronous operations and provides a way to gracefully cancel them before completion.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/function/predict.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Abortable**: Integration with `AbortSignal` for clean cancellation.
- **Timeout Support**: Automatically aborts if the operation exceeds the specified timeout.
- **Type-safe**: Properly infers the return type of the executed function.

## API

```ts
function predict<T>(
  fn: (signal: AbortSignal) => Promise<T>, 
  options?: {
    signal?: AbortSignal;
    timeout?: number;
  }
): Promise<T>
```

### Parameters

- `fn`: An asynchronous function that receives an `AbortSignal` and returns a Promise.
- `options`: Optional configuration:
  - `signal`: An external `AbortSignal` to use for aborting the operation.
  - `timeout`: Maximum time in milliseconds before the operation is aborted (defaults to `7000`).

### Returns

- A Promise that resolves with the result of `fn`.
- Rejects with an "Operation aborted" error if the timeout is reached or the signal is aborted.

## Examples

### Basic Timeout Control

```ts
import { predict } from '@vielzeug/toolkit';

const slowFn = (signal: AbortSignal) => new Promise((resolve) => setTimeout(() => resolve('slow'), 10000));

const fastFn = (signal: AbortSignal) => new Promise((resolve) => setTimeout(() => resolve('fast'), 5000));

predict(slowFn); // rejects after 7 seconds (default timeout)
predict(fastFn); // resolves with 'fast' after 5 seconds
```

### With Custom Timeout

```ts
import { predict } from '@vielzeug/toolkit';

const result = await predict(
  async (signal) => {
    const response = await fetch('/api/data', { signal });
    return response.json();
  },
  { timeout: 3000 },
);
```

### With External AbortSignal

```ts
import { predict } from '@vielzeug/toolkit';

const controller = new AbortController();

const promise = predict(
  async (signal) => {
    // Your async operation here
    return await fetchData(signal);
  },
  { signal: controller.signal, timeout: 5000 },
);

// Abort from outside
controller.abort();
```

## Implementation Notes

- Uses `AbortSignal.timeout()` and `AbortSignal.any()` for efficient timeout handling.
- The function receives the combined abort signal that triggers on either timeout or external abort.
- The promise races between the function execution and the abort signal.

## See Also

- [retry](./retry.md): Re-run an entire action multiple times.
- [sleep](./sleep.md): Pause execution for a fixed duration.
- [worker](./worker.md): Run heavy logic in a separate thread.

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-212_B-success" alt="Size">
</div>

# predict

The `predict` utility returns a Promise that resolves when a given condition becomes true. It periodically checks the condition based on a specified interval and can be configured with a timeout to prevent infinite waiting.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/function/predict.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Polling Logic**: Efficiently waits for external states or async flags to change.
- **Timeout Support**: Automatically rejects if the condition is not met within the allowed time.
- **Type-safe**: Proper Promise-based flow control.

## API

```ts
interface PredictOptions {
  interval?: number;
  timeout?: number;
}

interface PredictFunction {
  (fn: () => boolean | Promise<boolean>, options?: PredictOptions): Promise<void>;
}
```

### Parameters

- `fn`: A function that returns a boolean (or a Promise resolving to one). Polling stops when this returns `true`.
- `options`: Optional configuration:
  - `interval`: Time in milliseconds between each check (defaults to `100`).
  - `timeout`: Maximum time in milliseconds to wait before rejecting (defaults to `5000`).

### Returns

- A Promise that resolves when `fn()` returns `true`.
- Rejects with a "Timeout" error if the `timeout` is reached first.

## Examples

### Waiting for global state

```ts
import { predict } from '@vielzeug/toolkit';

// Wait until a specific variable is set by an external script
await predict(() => window.myLibraryReady === true);
console.log('Library is ready!');
```

### With Custom Timing

```ts
import { predict } from '@vielzeug/toolkit';

await predict(
  async () => {
    const status = await checkStatus();
    return status === 'COMPLETED';
  },
  { interval: 500, timeout: 10000 },
);
```

## Implementation Notes

- Uses a recursive `setTimeout` loop to avoid blocking the event loop.
- Throws a `TypeError` if `fn` is not a function.
- If `timeout` is set to `0` or less, it will only check the condition once.

## See Also

- [retry](./retry.md): Re-run an entire action multiple times.
- [sleep](./sleep.md): Pause execution for a fixed duration.
- [worker](./worker.md): Run heavy logic in a separate thread.

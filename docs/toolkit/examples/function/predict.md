# predict

Creates a Promise that can be aborted using an AbortController or after a timeout.

## API

```ts
predict<T>(fn: (signal: AbortSignal) => Promise<T>, options?: { signal?: AbortSignal; timeout?: number }): Promise<T>
```

- `fn`: Function to execute, receives an AbortSignal.
- `options.signal`: Optional AbortSignal to allow external aborting.
- `options.timeout`: Timeout in ms before aborting (default: 7000).
- Returns: Promise resolving to result or rejecting if aborted/timed out.

## Example

```ts
import { predict } from '@vielzeug/toolkit';

const slowFn = () => new Promise((resolve) => setTimeout(() => resolve('slow'), 10000));
predict(slowFn) // rejects after 7 seconds (default timeout)
  .then(result => console.log(result))
  .catch(err => console.error(err)); // handles the rejection
```

## Notes

- Useful for abortable async operations.
- Rejects with error if aborted or timed out.
- To abort a running promise, call `controller.abort()` where `controller` is an instance of `AbortController` passed in `options.signal`.

## Related

- [retry](./retry.md)
- [sleep](./sleep.md)

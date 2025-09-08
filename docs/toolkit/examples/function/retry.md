# retry

Retries an asynchronous function a specified number of times with delay and optional exponential backoff and abort support.

## API

```ts
retry<T>(
  fn: () => Promise<T>,
  options?: {
    times?: number;
    delay?: number;
    backoff?: number;
    signal?: AbortSignal;
  }
): Promise<T>
```

- `fn`: Async function to retry.
- `options.times`: Number of retry attempts (default: 3).
- `options.delay`: Delay in ms between retries (default: 250).
- `options.backoff`: Exponential backoff factor (default: 1 = no backoff).
- `options.signal`: Optional AbortSignal to cancel retries.
- Returns: Promise resolving to result or rejecting after all retries fail or if aborted.

## Example

```ts
import { retry } from '@vielzeug/toolkit';

await retry(() => fetch('/api/data'), { times: 3, delay: 1000, backoff: 2 });
```

## Notes

- Supports exponential backoff and aborting with AbortSignal.
- Useful for network or unreliable async operations.
- Backoff is exponential: `delay * backoff ^ (attempt - 1)`.
- If `signal` is aborted, pending retries are rejected with an `AbortError`.

## Related

- [predict](./predict.md)
- [sleep](./sleep.md)

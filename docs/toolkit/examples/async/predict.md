<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-~0.5KB-success" alt="Size">
</div>

# predict

Execute async logic with timeout and optional cancellation via AbortSignal.

## Signature

```typescript
function predict<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options?: { signal?: AbortSignal; timeout?: number },
): Promise<T>;
```

## Parameters

- `fn` - Async function that receives a merged `AbortSignal`.
- `options.timeout` - Timeout in milliseconds (default `7000`).
- `options.signal` - Optional external signal to cancel early.

## Example

```typescript
import { predict } from '@vielzeug/toolkit';

const result = await predict(async (signal) => {
  const response = await fetch('/api/user', { signal });
  return response.json();
}, { timeout: 2_000 });

console.log(result);
```

## Related

- [attempt](./attempt.md) - Wraps `retry` + `predict` into `{ ok, value | error }`.
- [retry](./retry.md) - Retry strategy with delay and predicates.

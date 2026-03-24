<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-~1.2KB-success" alt="Size">
</div>

# attempt

Execute an async function with retry + timeout handling and receive a discriminated result.

## Signature

```typescript
type AttemptOptions = {
  onError?: (err: unknown) => void;
  timeout?: number;
  times?: number;
};

type AttemptResult<R> = { ok: true; value: R } | { error: unknown; ok: false };

function attempt<T extends Fn, R = Awaited<ReturnType<T>>>(fn: T, options?: AttemptOptions): Promise<AttemptResult<R>>;
```

## Parameters

- `fn` - Function to execute.
- `options.times` - Total attempts including the first (default: `3`).
- `options.timeout` - Per-attempt timeout in ms (default: `7000`).
- `options.onError` - Called once when all attempts fail.

## Returns

A promise that resolves to:

- `{ ok: true, value }` on success
- `{ ok: false, error }` on failure

## Examples

### Basic usage

```typescript
import { attempt } from '@vielzeug/toolkit';

const result = await attempt(async () => {
  if (Math.random() < 0.7) throw new Error('Random failure');
  return 'Success!';
});

if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.error);
}
```

### Retry + timeout

```typescript
import { attempt } from '@vielzeug/toolkit';

const user = await attempt(() => fetch('/api/user').then((r) => r.json()), {
  times: 5,
  timeout: 10_000,
  onError: (err) => console.error('user fetch failed', err),
});

if (user.ok) {
  console.log(user.value);
}
```

## Related

- [retry](./retry.md) - Retry async operations with backoff
- [race](./race.md) - Enforce minimum loading durations

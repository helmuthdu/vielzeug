# isAbortError

Returns `true` if the value is an `Error` with `name === 'AbortError'`.

## Signature

```ts
function isAbortError(value: unknown): value is Error
```

## Examples

### Basic usage

```ts
import { isAbortError } from '@vielzeug/arsenal';

const ac = new AbortController();
ac.abort();

try {
  await fetch('/api', { signal: ac.signal });
} catch (err) {
  if (isAbortError(err)) {
    console.log('Request was cancelled');
  } else {
    throw err; // re-throw non-abort errors
  }
}
```

### With abortable

```ts
import { abortable, isAbortError } from '@vielzeug/arsenal';

const ac = new AbortController();
const promise = abortable(fetch('/api').then((r) => r.json()), ac.signal);

ac.abort();

try {
  await promise;
} catch (err) {
  console.log(isAbortError(err)); // true
}
```

## Related

- [abortError](../async/abortError.md) — Construct or extract an abort error
- [abortable](../async/abortable.md) — Wrap a promise to reject on signal fire
- [isError](./isError.md) — Check if a value is an `Error` instance

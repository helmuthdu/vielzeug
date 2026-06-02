# abortError

Extracts the abort reason from an `AbortSignal`, or constructs a `DOMException('Aborted', 'AbortError')` when no reason is set.

## Signature

```ts
function abortError(signal?: AbortSignal): unknown
```

## Parameters

- `signal` — (optional) An aborted `AbortSignal` to extract the reason from.

## Returns

- The signal's `reason` if present, otherwise `new DOMException('Aborted', 'AbortError')`.

## Examples

### Default DOMException

```ts
import { abortError } from '@vielzeug/arsenal';

throw abortError(); // DOMException { name: 'AbortError' }
```

### Extract signal reason

```ts
import { abortError } from '@vielzeug/arsenal';

const ac = new AbortController();
ac.abort(new TypeError('Request cancelled'));

throw abortError(ac.signal); // TypeError: Request cancelled
```

### Use with isAbortError

```ts
import { abortError, isAbortError } from '@vielzeug/arsenal';

try {
  const ac = new AbortController();
  ac.abort();
  throw abortError(ac.signal);
} catch (err) {
  if (isAbortError(err)) {
    console.log('Aborted');
  }
}
```

## Related

- [abortable](./abortable.md) — Wrap a promise to reject on signal fire
- [waitFor](./waitFor.md) — Poll until a condition is met
- [retry](./retry.md) — Retry async operations with backoff

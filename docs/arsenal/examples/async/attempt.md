---
title: 'Arsenal Examples — attempt / isOk / isFail'
description: 'attempt, isOk, isFail example for @vielzeug/arsenal.'
---

## attempt / isOk / isFail

### Problem

You want to call an async function and handle success and failure in one place without try/catch — returning a discriminated union instead of throwing.

### Solution

Use `attempt(fn)` to receive `{ ok: true, value }` on success or `{ ok: false, error }` on failure. It never throws.

Use `isOk(result)` and `isFail(result)` as type-guard helpers to narrow the discriminated union.

```ts
import { attempt, isOk, isFail } from '@vielzeug/arsenal';

const result = await attempt(() => fetch('/api/user').then((r) => r.json()));

if (isOk(result)) {
  console.log(result.value); // typed as the resolved value
} else {
  console.error(result.error); // the caught error
}

// Or narrow with isFail for early-return pattern
if (isFail(result)) {
  reportError(result.error);
  return;
}
console.log(result.value);
```

#### Combining with retry

```ts
import { attempt, retry } from '@vielzeug/arsenal';

const result = await attempt(() =>
  retry((signal) => fetch('/api/data', { signal }).then((r) => r.json()), { times: 3 }),
);

if (!result.ok) {
  reportError(result.error);
}
```

### Pitfalls

- `attempt` wraps a single call — it does not retry on failure. Use `retry` for resilient calls and wrap the whole thing in `attempt` if you want a non-throwing result.
- The `error` field is typed as `unknown`; narrow it before accessing properties.

### Related

- [retry](./retry.md)
- [parallel](./parallel.md)

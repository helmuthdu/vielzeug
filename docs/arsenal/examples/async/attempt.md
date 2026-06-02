# attempt

Executes an async function and returns an `AttemptResult` — never throws. On success returns `{ ok: true, value }`, on failure returns `{ ok: false, error }`.

## Signature

```ts
type AttemptResult<T> = { ok: true; value: T } | { error: unknown; ok: false };

async function attempt<T>(fn: () => Promise<T>): Promise<AttemptResult<T>>
```

## Parameters

- `fn` — Async function to execute.

## Returns

A promise that always resolves to:
- `{ ok: true, value }` on success
- `{ error, ok: false }` on failure — never rejects

## Examples

### Basic usage

```ts
import { attempt } from '@vielzeug/arsenal';

const result = await attempt(async () => {
  const res = await fetch('/api/user');
  return res.json();
});

if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.error);
}
```

### Combine with retry

```ts
import { attempt, retry } from '@vielzeug/arsenal';

const result = await attempt(() =>
  retry(() => fetch('/api/user').then((r) => r.json()), {
    times: 3,
    delay: 500,
  }),
);

if (result.ok) {
  console.log('user:', result.value);
} else {
  console.warn('all retries exhausted:', result.error);
}
```

### Replace try/catch in async flows

```ts
import { attempt } from '@vielzeug/arsenal';

async function loadDashboard() {
  const [users, stats] = await Promise.all([
    attempt(() => fetchUsers()),
    attempt(() => fetchStats()),
  ]);

  return {
    users: users.ok ? users.value : [],
    stats: stats.ok ? stats.value : null,
  };
}
```

## Related

- [retry](./retry.md) — Retry async operations with backoff
- [abortable](./abortable.md) — Wrap a promise to reject on signal fire
- [waitFor](./waitFor.md) — Poll until a condition is met

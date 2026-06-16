---
title: 'Courier Examples — Error Handling Patterns'
description: 'Error Handling Patterns example for @vielzeug/courier.'
---

## Error Handling Patterns

### Problem

HTTP errors (4xx, 5xx), network failures, and timeouts need different recovery strategies. You want consistent handling across all call sites without repeating the same try/catch branches.

### Solution

Use the specific error classes (`AbortError`, `TimeoutError`, `NetworkError`, `HttpError`) to narrow by failure mode, and `shouldRetry` on `createQuery()` or `createMutation()` to customize retry behavior.

#### Status-code branching

```ts
import { AbortError, HttpError, TimeoutError } from '@vielzeug/courier';

try {
  await api.get('/users/1');
} catch (err) {
  if (err instanceof AbortError) return; // user canceled
  if (err instanceof TimeoutError) return toast.error('Request timed out');
  if (HttpError.is(err, 404)) return null;
  if (HttpError.is(err, 401)) return redirectToLogin();
  if (HttpError.is(err, 403)) return showForbidden();
  if (HttpError.is(err)) throw new Error(`Unexpected ${err.status}: ${err.url}`);
  throw err; // re-throw non-Courier errors
}
```

### Global error logger

```ts
const api = createApi({ baseUrl: 'https://api.example.com' });

api.use(async (ctx, next) => {
  try {
    return await next(ctx);
  } catch (error) {
    Sentry.captureException(error, {
      extra: { method: ctx.init.method, url: ctx.url },
    });
    throw error;
  }
});
```

### Mutation error state

```ts
const mutation = createMutation((input: number, signal: AbortSignal) => api.delete(`/users/${input}`, { signal }));

mutation.subscribe((state) => {
  if (state.status === 'error') {
    // State is observable — no need for try/catch in UI
    toast.error(state.error!.message);
    mutation.reset();
  }
});

mutation.mutate(1).catch(() => {}); // error is surfaced via state, not thrown
```

### Pitfalls

- Courier throws distinct classes for each failure mode — `HttpError` (has a response), `NetworkError` (no response), `TimeoutError`, and `AbortError`. Catching only `HttpError` misses connection failures.
- A `500` response with a JSON error body throws `HttpError`, not a generic `Error`. Do not use `instanceof Error` alone to detect HTTP failures.
- Retrying on all errors wastes resources on 401 (wrong credentials) or 422 (validation failure). Limit retries to `NetworkError` and `HttpError` with status ≥ 500.

### Related

- [Production Logging (Rune)](@vielzeug/rune/examples/production-setup)

- [Authentication](./authentication.md)
- [CRUD Operations](./crud-operations.md)
- [Disposal](./disposal.md)

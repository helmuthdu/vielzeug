---
title: 'Courier Examples — Error Handling Patterns'
description: 'Error Handling Patterns example for @vielzeug/courier.'
---

## Error Handling Patterns

### Problem

HTTP errors (4xx, 5xx), network failures, and timeouts need different recovery strategies. You want consistent handling across all call sites without repeating the same try/catch branches.

### Solution

Use the specific error classes (`CourierAbortError`, `CourierTimeoutError`, `CourierNetworkError`, `CourierHttpError`) to narrow by failure mode, and `shouldRetry` on `createQuery()` or `createMutation()` to customize retry behavior.

#### Status-code branching

```ts
import { CourierAbortError, CourierHttpError, CourierTimeoutError } from '@vielzeug/courier';

try {
  await api.get('/users/1');
} catch (err) {
  if (err instanceof CourierAbortError) return; // user canceled
  if (err instanceof CourierTimeoutError) return toast.error('Request timed out');
  if (CourierHttpError.is(err, 404)) return null;
  if (CourierHttpError.is(err, 401)) return redirectToLogin();
  if (CourierHttpError.is(err, 403)) return showForbidden();
  if (CourierHttpError.is(err)) throw new Error(`Unexpected ${err.status}: ${err.url}`);
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

- Courier throws distinct classes for each failure mode — `CourierHttpError` (has a response), `CourierNetworkError` (no response), `CourierTimeoutError`, and `CourierAbortError`. Catching only `CourierHttpError` misses connection failures.
- A `500` response with a JSON error body throws `CourierHttpError`, not a generic `Error`. Do not use `instanceof Error` alone to detect HTTP failures.
- Retrying on all errors wastes resources on 401 (wrong credentials) or 422 (validation failure). Limit retries to `CourierNetworkError` and `CourierHttpError` with status ≥ 500.

### Related

- [Production Logging (Rune)](@vielzeug/rune/examples/production-setup)

- [Authentication](./authentication.md)
- [CRUD Operations](./crud-operations.md)
- [Disposal](./disposal.md)

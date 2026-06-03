---
title: 'Courier Examples — Error Handling Patterns'
description: 'Error Handling Patterns example for @vielzeug/courier.'
---

## Error Handling Patterns

### Problem

HTTP errors (4xx, 5xx), network failures, and timeouts need different recovery strategies. You want consistent handling across all call sites without repeating the same try/catch branches.

### Solution

Use `HttpError.is()` to narrow by kind and status code at each call site, and `shouldRetry` on `createQuery()` or `createMutation()` to customize retry behavior per error class.

#### Status-code branching

```ts
import { HttpError } from '@vielzeug/courier';

try {
  await api.get('/users/1');
} catch (err) {
  if (HttpError.is(err, 404)) return null;
  if (HttpError.is(err, 401)) return redirectToLogin();
  if (HttpError.is(err, 403)) return showForbidden();
  if (HttpError.is(err) && err.kind === 'timeout') return toast.error('Request timed out');
  if (HttpError.is(err) && err.kind === 'abort') return; // user canceled
  if (HttpError.is(err)) throw new Error(`Unexpected ${err.status}: ${err.url}`);
  throw err; // re-throw non-HTTP errors
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

- Courier distinguishes HTTP errors (4xx/5xx with a response) from network errors (no response). Treating them identically hides the root cause — check `response.ok` before accessing the body.
- A `500` response with a JSON error body arrives in the success path unless you throw in the `onResponse` interceptor. Do not assume an HTTP error is a thrown exception.
- Retrying on all errors wastes resources on 401 (wrong credentials) or 422 (validation failure). Limit retries to network errors and 5xx status codes.

### Related

- [Production Logging (Rune)](@vielzeug/rune/examples/production-setup)

- [Authentication](./authentication.md)
- [CRUD Operations](./crud-operations.md)
- [Disposal](./disposal.md)

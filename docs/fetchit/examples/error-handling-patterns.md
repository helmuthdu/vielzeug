---
title: 'Fetchit Examples — Error Handling Patterns'
description: 'Error Handling Patterns examples for fetchit.'
---

## Error Handling Patterns

## Problem

Implement error handling patterns in a production-friendly way with `@vielzeug/fetchit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/fetchit` installed.

### Status-code branching

```ts
import { HttpError } from '@vielzeug/fetchit';

try {
  await api.get('/users/1');
} catch (err) {
  if (HttpError.is(err, 404)) return null;
  if (HttpError.is(err, 401)) return redirectToLogin();
  if (HttpError.is(err, 403)) return showForbidden();
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
const mutation = createMutation(({ input, signal }: { input: number; signal?: AbortSignal }) =>
  api.delete(`/users/${input}`, { signal }),
);

mutation.subscribe((state) => {
  if (state.status === 'error') {
    // State is observable — no need for try/catch in UI
    toast.error(state.error!.message);
    mutation.reset();
  }
});

mutation.mutate(1).catch(() => {}); // error is surfaced via state, not thrown
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Authentication](./authentication.md)
- [CRUD Operations](./crud-operations.md)
- [Disposal](./disposal.md)

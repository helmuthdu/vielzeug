---
title: 'Fetchit Examples — Query Subscriptions'
description: 'Query subscription examples for fetchit.'
---

## Query Subscriptions

## Problem

Implement query subscriptions in a production-friendly way with `@vielzeug/fetchit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/fetchit` installed.

Subscriptions give one stable mental model for UI state: subscribe once, render from `QueryState`, and trigger reads imperatively.

```ts
const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery({ staleTime: 5_000 });

const stop = qc.subscribe<User>(['users', userId], (state) => {
  if (state.status === 'pending') renderSpinner();
  if (state.status === 'error') toast.error(state.error!.message);
  if (state.status === 'success') renderUser(state.data!);
});

await qc.query({
  key: ['users', userId],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: userId }, signal }),
});

stop();

// Retry policy can be set per query call
const retryingQc = createQuery();

await retryingQc.query({
  key: ['config'],
  fn: ({ signal }) => api.get('/config', { signal }),
  retry: 3,
  shouldRetry: (err) => !HttpError.is(err) || (err.status ?? 500) >= 500,
});
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

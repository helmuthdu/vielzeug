---
title: 'Fetchit Examples — Query Callbacks'
description: 'Query Callbacks examples for fetchit.'
---

## Query Callbacks

## Problem

Implement query callbacks in a production-friendly way with `@vielzeug/fetchit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/fetchit` installed.

Per-call `onSuccess`, `onError`, and `onSettled` callbacks fire only when the `query()` call triggers a real network request — not on cache hits or shared inflight promises.

```ts
const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery({ staleTime: 5_000 });

// Toast notification on success
await qc.query({
  key: ['users', userId],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: userId }, signal }),
  onSuccess: (user) => toast.success(`Loaded ${user.name}`),
  onError: (err) => toast.error(err.message),
  onSettled: (data, err) => analytics.track('users.load', { ok: !err }),
});

// Only retry server errors — skip 4xx immediately
await qc.query({
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

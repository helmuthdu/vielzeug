---
title: 'Fetchit Examples — Optimistic Updates'
description: 'Optimistic Updates examples for fetchit.'
---

## Optimistic Updates

## Problem

Implement optimistic updates in a production-friendly way with `@vielzeug/fetchit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/fetchit` installed.

```ts
const userId = 1;
const key = ['users', userId];

const updateUser = createMutation((patch: Partial<User>) =>
  api.put<User>('/users/{id}', { params: { id: userId }, body: patch }),
);

// Apply optimistic update immediately
qc.set<User>(key, (old) => ({ ...old!, ...patch }));

try {
  await updateUser.mutate(patch);
  // Server confirmed — force sync
  qc.invalidate(key);
} catch {
  // Server rejected — roll back
  qc.invalidate(key);
}
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

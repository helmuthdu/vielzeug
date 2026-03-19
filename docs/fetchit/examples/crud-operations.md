---
title: 'Fetchit Examples — CRUD Operations'
description: 'CRUD Operations examples for fetchit.'
---

## CRUD Operations

## Problem

Implement crud operations in a production-friendly way with `@vielzeug/fetchit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/fetchit` installed.

```ts
import { createApi, createMutation, createQuery } from '@vielzeug/fetchit';

const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery({ staleTime: 5_000 });

// READ — cached
const users = await qc.query({
  key: ['users'],
  fn: ({ signal }) => api.get<User[]>('/users', { signal }),
});

// READ one
const user = await qc.query({
  key: ['users', 1],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
});

// CREATE
const addUser = createMutation((data: NewUser) => api.post<User>('/users', { body: data }), {
  onSuccess: (user) => {
    qc.set(['users', user.id], user);
    qc.invalidate(['users']);
  },
});
await addUser.mutate({ name: 'Alice', email: 'alice@example.com' });

// UPDATE
const updateUser = createMutation(
  ({ id, ...patch }: { id: number } & Partial<User>) => api.put<User>('/users/{id}', { params: { id }, body: patch }),
  { onSuccess: (user) => qc.set(['users', user.id], user) },
);
await updateUser.mutate({ id: 1, name: 'Alice Smith' });

// DELETE
const deleteUser = createMutation((id: number) => api.delete(`/users/${id}`), {
  onSuccess: (_, id) => qc.invalidate(['users']),
});
await deleteUser.mutate(1);
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
- [Disposal](./disposal.md)
- [Error Handling Patterns](./error-handling-patterns.md)

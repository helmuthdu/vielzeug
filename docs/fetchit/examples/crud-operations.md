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
const addUser = createMutation(({ input, signal }: { input: NewUser; signal?: AbortSignal }) =>
  api.post<User>('/users', { body: input, signal }),
);

const created = await addUser.mutate({ name: 'Alice', email: 'alice@example.com' });
qc.set(['users', created.id], created);
qc.invalidate(['users']);

// UPDATE
const updateUser = createMutation(
  ({ input, signal }: { input: { id: number } & Partial<User>; signal?: AbortSignal }) => {
    const { id, ...patch } = input;
    return api.put<User>('/users/{id}', { params: { id }, body: patch, signal });
  },
);

const updated = await updateUser.mutate({ id: 1, name: 'Alice Smith' });
qc.set(['users', updated.id], updated);

// DELETE
const deleteUser = createMutation(({ input, signal }: { input: number; signal?: AbortSignal }) =>
  api.delete(`/users/${input}`, { signal }),
);

await deleteUser.mutate(1);
qc.invalidate(['users']);
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

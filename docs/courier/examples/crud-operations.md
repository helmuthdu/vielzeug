---
title: 'Courier Examples — CRUD Operations'
description: 'CRUD Operations example for @vielzeug/courier.'
---

## CRUD Operations

### Problem

You need to perform the full create, read, update, delete lifecycle against a REST resource with typed request and response bodies, sharing a single base URL configuration.

### Solution

Use `createApi()` with `createQuery()` for cached reads and `createMutation()` for writes, then update the cache with `qc.set()` and `qc.invalidate()` after each mutation.

```ts
import { createApi, createMutation, createQuery } from '@vielzeug/courier';

const api = createApi({ baseUrl: 'https://api.example.com' });
const qc = createQuery({ staleTime: 5_000 });

// READ — cached
const users = await qc.fetch({
  key: ['users'],
  fn: ({ signal }) => api.get<User[]>('/users', { signal }),
});

// READ one
const user = await qc.fetch({
  key: ['users', 1],
  fn: ({ signal }) => api.get<User>('/users/{id}', { params: { id: 1 }, signal }),
});

// CREATE
const addUser = createMutation((input: NewUser, signal: AbortSignal) =>
  api.post<User>('/users', { body: input, signal }),
);

const created = await addUser.mutate({ name: 'Alice', email: 'alice@example.com' });
qc.set(['users', created.id], created);
qc.invalidate(['users']);

// UPDATE
const updateUser = createMutation((input: { id: number } & Partial<User>, signal: AbortSignal) => {
  const { id, ...patch } = input;
  return api.put<User>('/users/{id}', { params: { id }, body: patch, signal });
});

const updated = await updateUser.mutate({ id: 1, name: 'Alice Smith' });
qc.set(['users', updated.id], updated);

// DELETE
const deleteUser = createMutation((input: number, signal: AbortSignal) =>
  api.delete('/users/{id}', { params: { id: input }, signal }),
);

await deleteUser.mutate(1);
qc.invalidate(['users']);
```


### Pitfalls

- Query keys must be stable across renders. Building them with `Date.now()` or random values bypasses the cache and triggers a fresh fetch on every call.
- `mutation.mutate()` does not automatically invalidate related queries. Call `qc.invalidate()` after a successful mutation to reflect the server change.
- `DELETE` responses often return 204 with no body. Attempting to parse an empty body as JSON throws. Handle the no-content case explicitly before parsing.

### Related
- [Shared Module Store (Ripple)](@vielzeug/ripple/examples/pattern-shared-module-store)
- [Optimistic Updates](./optimistic-updates)

- [Authentication](./authentication.md)
- [Disposal](./disposal.md)
- [Error Handling Patterns](./error-handling-patterns.md)

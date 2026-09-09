---
title: 'Courier Examples — CRUD Operations'
description: 'Cached reads and explicit writes with one Courier client.'
---

## CRUD Operations

### Problem

A users screen needs a cached list and predictable invalidation after creating a user.

### Solution

Use a structured key for the parsed GET, then invalidate its prefix after a successful write.

```ts
import { createCourier } from '@vielzeug/courier';

type User = { id: number; name: string };

const courier = createCourier({ baseUrl: 'https://api.example.com' });
const accountId = 'account-1';
const cache = { key: ['accounts', accountId, 'users'] as const, ttlMs: 10_000 };

const users = await courier.get<User[]>('/users', { cache, query: { limit: 20 } });
const created = await courier.post<User>('/users', { body: { name: 'Ada' } });
courier.invalidateCache(['accounts', accountId, 'users']);

console.log(users.length, created.id);
```

### Pitfalls

- Include stable non-secret principal or tenant atoms when authorization changes the representation.
- Prefix invalidation prevents pending matches from being cached but does not reject their existing callers.
- Observable mutation and optimistic state still belong to the application state layer.

### Related

- [Cached Reads and Prefetching](../usage.md#cached-reads-and-prefetching)
- [Optimistic Updates](./optimistic-updates.md)

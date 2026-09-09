---
title: 'Courier Examples — Optimistic Updates'
description: 'Own optimistic state explicitly while Courier performs the HTTP write.'
---

## Optimistic Updates

### Problem

A user list should update immediately while an HTTP write is pending, then reconcile success or restore previous state on failure.

### Solution

Keep the optimistic transaction in the application state owner and use Courier only for transport.

```ts
import { createCourier } from '@vielzeug/courier';

type User = { id: number; name: string };
const courier = createCourier({ baseUrl: '/api' });
let users = await courier.get<User[]>('/users');

async function renameUser(id: number, name: string): Promise<User> {
  const previous = users;
  users = users.map((user) => (user.id === id ? { ...user, name } : user));

  try {
    const saved = await courier.patch<User>('/users/{id}', {
      body: { name },
      params: { id },
    });
    users = users.map((user) => (user.id === saved.id ? saved : user));
    return saved;
  } catch (error) {
    users = previous;
    throw error;
  }
}
```

### Pitfalls

- Serialize or version overlapping writes before using whole-state rollback.
- Keep rollback and reconciliation in the state owner, not transport middleware.
- Use Postmaster when writes must survive reloads or offline periods.
- Use a dedicated server-state cache when keyed invalidation and shared optimistic state are primary requirements.

### Related

- [Courier 3.0 Migration](../migration.md)
- [Sourcerer Page Source](../../sourcerer/usage.md#working-with-other-vielzeug-libraries)

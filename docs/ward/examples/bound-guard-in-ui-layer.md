---
title: 'Ward Examples — Bound Guard in UI Layer'
description: 'Bound guard in UI layer example for @vielzeug/ward.'
---

## Bound Guard in UI Layer

### Problem

A UI module renders conditional controls (edit button, delete button) based on the current user's permissions. You want to check multiple permissions for the same user without passing the principal repeatedly to every call.

### Solution

Call `forUser()` once when the user context is established. It returns a `BoundWard` that snapshots the principal and binds all decision methods to it.

```ts
import { createWard } from '@vielzeug/ward';

const ward = createWard([
  { role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' },
  { role: 'editor', resource: 'posts', action: 'update', effect: 'allow' },
]);

const KNOWN_ACTIONS = ['read', 'update', 'delete'] as const;

export function usePostActions(user: { id: string; roles: string[] }) {
  const bound = ward.forUser(user);

  return {
    // Returns the subset of KNOWN_ACTIONS the user is allowed to perform
    actions: bound.allowedActions('posts', KNOWN_ACTIONS),
    canRead: bound.can('posts', 'read'),
    canUpdate: bound.can('posts', 'update'),
    canDelete: bound.can('posts', 'delete'),
    explainDelete: bound.explain('posts', 'delete'),
  };
}
```

### Pitfalls

- The bound view snapshots the principal at call time. If you call `forUser(user)` and then mutate `user.roles`, the bound view will not reflect the change. Create a new bound view when the user's roles change.
- `allowedActions()` requires `knownActions`. It does not discover action names from the rule set on its own.

### Related

- [Blog Roles](./blog-roles.md)
- [Wildcard Action](./wildcard-action.md)

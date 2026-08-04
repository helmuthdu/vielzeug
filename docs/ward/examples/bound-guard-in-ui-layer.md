---
title: 'Ward Examples — Bound Guard in UI Layer'
description: 'Create a principal-bound Ward view for repeated UI permission checks.'
---

## Bound Guard in UI Layer

### Problem

A UI often needs several permission checks for one signed-in user without repeating that principal in every call.

### Solution

Bind the current user once with `forUser()` and expose the resulting action checks to the UI.

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
    actions: bound.allowedActions({ resource: 'posts', knownActions: KNOWN_ACTIONS }),
    canRead: bound.explain({ resource: 'posts', action: 'read' }).allowed,
    canUpdate: bound.explain({ resource: 'posts', action: 'update' }).allowed,
    canDelete: bound.explain({ resource: 'posts', action: 'delete' }).allowed,
  };
}
```

### Pitfalls

- `forUser()` snapshots user roles; bind again when identity or roles change.
- Keep authorization at mutation and request boundaries; hidden UI controls are not an authorization check.

### Related

- [Blog Roles](./blog-roles.md)
- [Multi-Role Rules](./multi-role-rules.md)
- [Ward Usage Guide](../usage.md)

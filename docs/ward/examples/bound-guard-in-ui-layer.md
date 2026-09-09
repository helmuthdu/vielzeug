---
title: 'Ward Examples — Bound UI Permissions'
description: 'Bind an immutable principal for repeated UI permission checks.'
---

## Bound UI Permissions

### Problem

A UI repeats the same principal in several permission checks.

### Solution

Bind a principal snapshot, then use the bound decision helpers.

```ts
import { allow, createWard } from '@vielzeug/ward';

const ward = createWard<'read' | 'update' | 'delete', 'posts'>([
  allow('viewer', 'posts', ['read']),
  allow('editor', 'posts', ['read', 'update']),
]);

export function postActions(principal) {
  const permissions = ward.forPrincipal(principal);
  const actions = permissions.allowedActions({
    knownActions: ['read', 'update', 'delete'],
    resource: 'posts',
  });

  return {
    canDelete: actions.includes('delete'),
    canRead: actions.includes('read'),
    canUpdate: actions.includes('update'),
  };
}
```

### Pitfalls

Always repeat authorization at the mutation or request boundary; hidden controls are not security enforcement.

### Related

- [Blog roles](./blog-roles.md)
- [Auditing decisions](./logger-for-auditing.md)

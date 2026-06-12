---
title: 'Ward Examples — Blog Roles'
description: 'Blog roles example for @vielzeug/ward.'
---

## Blog Roles

### Problem

You need to model a blog with multiple roles: anonymous visitors can read posts, editors can create and update their own posts, and admins can delete. Each role has different permissions and some require ownership checks.

### Solution

Use `createWard` with per-role rules and `owns()` to gate the update action on authorship.

```ts
import { ANONYMOUS, createWard, owns } from '@vielzeug/ward';

const ward = createWard<'read' | 'create' | 'update' | 'delete', { authorId: string }>([
  { role: ANONYMOUS, resource: 'posts', action: 'read', effect: 'allow' },
  { role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' },
  { role: 'editor', resource: 'posts', action: 'create', effect: 'allow' },
  { role: 'editor', resource: 'posts', action: 'update', effect: 'allow', when: owns('authorId') },
  { role: 'admin', resource: 'posts', action: 'delete', effect: 'allow' },
]);

// Anonymous visitor can read
ward.can(null, 'posts', 'read'); // true

// Editor can update their own post but not another's
ward.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u1' }); // true
ward.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u2' }); // false

// Admin can delete, editor cannot
ward.can({ id: 'u2', roles: ['admin'] }, 'posts', 'delete'); // true
ward.can({ id: 'u1', roles: ['editor'] }, 'posts', 'delete'); // false
```

### Pitfalls

- Forgetting to pass `data` to `can()` when the rule has a `when` predicate causes the predicate to receive `data: undefined`. `owns()` returns `false` in that case, so the action is denied.
- Role names are matched exactly. `'Editor'` does not match the rule with `role: 'editor'`.
- If you add an admin allow rule for all resources with `WILDCARD`, place it at a higher `priority` than any specific deny rules if you want it to override them.

### Related

- [Multi-Role Rules](./multi-role-rules.md)
- [Wildcard Action](./wildcard-action.md)
- [Inheritance and Overrides](./inheritance-and-overrides.md)

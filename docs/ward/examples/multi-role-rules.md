---
title: 'Ward Examples — Multi-Role Rules'
description: 'Grant one policy rule to several roles while preserving deterministic precedence.'
---

## Multi-Role Rules

### Problem

Share common permissions among viewer, editor, and admin roles without duplicating otherwise identical rules.

### Solution

Use a role array in each rule and let Ward expand it into the same deterministic policy model.

```ts
import { ANONYMOUS, createWard } from '@vielzeug/ward';

const ward = createWard<'read' | 'update' | 'delete'>([
  { role: ['viewer', 'editor', 'admin'], resource: 'posts', action: 'read', effect: 'allow' },
  { role: ['editor', 'admin'], resource: 'posts', action: 'update', effect: 'allow' },
  { role: 'admin', resource: 'posts', action: 'delete', effect: 'allow' },
  { role: [ANONYMOUS, 'viewer'], resource: 'landing', action: 'read', effect: 'allow' },
]);

ward.explain({ principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts', action: 'read' }).allowed; // true
ward.explain({ principal: { id: 'u2', roles: ['editor'] }, resource: 'posts', action: 'update' }).allowed; // true
ward.explain({ principal: { id: 'u3', roles: ['admin'] }, resource: 'posts', action: 'delete' }).allowed; // true
ward.explain({ principal: null, resource: 'landing', action: 'read' }).allowed; // true
```

### Pitfalls

- Multiple matching roles still use normal priority, specificity, effect, and declaration-order precedence.
- Anonymous principals cannot satisfy role-specific predicates.

### Related

- [Blog Roles](./blog-roles.md)
- [Wildcard Action](./wildcard-action.md)
- [Priority and Overrides](./inheritance-and-overrides.md)

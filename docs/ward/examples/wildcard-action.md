---
title: 'Ward Examples — Wildcard Action'
description: 'Grant every action in a known action set with a Ward wildcard rule.'
---

## Wildcard Action

### Problem

Grant an administrator every supported action on a resource without repeating one rule for each action.

### Solution

Use `WILDCARD` in the rule, then provide the known action universe to `allowedActions()`.

```ts
import { WILDCARD, createWard } from '@vielzeug/ward';

const ward = createWard<'read' | 'update' | 'delete'>([
  { role: 'admin', resource: 'posts', action: WILDCARD, effect: 'allow' },
]);

ward.explain({ principal: { id: 'u1', roles: ['admin'] }, resource: 'posts', action: 'read' }).allowed; // true
ward.explain({ principal: { id: 'u1', roles: ['admin'] }, resource: 'posts', action: 'delete' }).allowed; // true

const actions = ward.allowedActions({
  principal: { id: 'u1', roles: ['admin'] },
  resource: 'posts',
  knownActions: ['read', 'update', 'delete'] as const,
});
```

### Pitfalls

- `allowedActions()` needs a caller-provided `knownActions` list; Ward does not infer an action universe.
- This inspection API does not invoke the configured logger.

### Related

- [Multi-Role Rules](./multi-role-rules.md)
- [Rule Specificity](./disabling-wildcard-fallback.md)
- [Blog Roles](./blog-roles.md)

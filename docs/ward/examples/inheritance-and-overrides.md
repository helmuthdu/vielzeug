---
title: 'Ward Examples — Priority and Overrides'
description: 'Priority and overrides example for @vielzeug/ward.'
---

## Priority and Overrides

### Problem

You need to model a scenario where one role grants access but a second role (like a suspended or blocked state) should always override it, regardless of how many allow rules exist.

### Solution

Use `priority` to ensure the deny rule wins. Ward picks the rule with the highest priority; for equal priority it prefers higher specificity, then deny over allow.

```ts
import { createWard } from '@vielzeug/ward';

const ward = createWard([
  // Staff can normally read posts
  { role: 'staff', resource: 'posts', action: 'read', effect: 'allow', priority: 10 },
  // Suspended overrides all allow rules via higher priority
  { role: 'suspended', resource: 'posts', action: 'read', effect: 'deny', priority: 100 },
]);

// Result is deterministic regardless of role array ordering on the principal
ward.explain({ id: 'u1', roles: ['staff', 'suspended'] }, 'posts', 'read').allowed; // false
ward.explain({ id: 'u1', roles: ['suspended', 'staff'] }, 'posts', 'read').allowed; // false
ward.explain({ id: 'u2', roles: ['staff'] }, 'posts', 'read').allowed; // true
```

### Pitfalls

- Priority values have no inherent meaning beyond their relative order. Using large gaps (e.g., 10, 50, 100) leaves room to insert rules between existing ones without renumbering.
- When priority ties, Ward prefers the more specific rule (non-wildcard fields score higher). If specificity also ties, deny wins over allow. Design your priority scale so that intentional overrides never rely on the deny-tiebreak.

### Related

- [Blog Roles](./blog-roles.md)
- [Disabling Wildcard Fallback](./disabling-wildcard-fallback.md)

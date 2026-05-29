---
title: 'Permit Examples — Multi-Role Rules'
description: 'Multi-role rules example for @vielzeug/permit.'
---

## Multi-Role Rules

### Problem

You have multiple roles that share identical permissions on a resource. Writing one rule per role creates repetition and means you must update multiple rules when permissions change.

### Solution

Use an array for `role`. A rule with `role: ['viewer', 'editor']` matches any principal that holds at least one of those roles.

```ts
import { ANONYMOUS, createPermit } from '@vielzeug/permit';

const permit = createPermit<'read' | 'update' | 'delete'>([
  // One rule instead of three separate allow rules
  { role: ['viewer', 'editor', 'admin'], resource: 'posts', action: 'read',   effect: 'allow' },
  { role: ['editor', 'admin'],           resource: 'posts', action: 'update', effect: 'allow' },
  { role: 'admin',                       resource: 'posts', action: 'delete', effect: 'allow' },
]);

permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');   // true
permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'update'); // false
permit.can({ id: 'u2', roles: ['editor'] }, 'posts', 'update'); // true
permit.can({ id: 'u3', roles: ['admin'] },  'posts', 'delete'); // true
```

#### With ANONYMOUS in a Multi-Role Array

`ANONYMOUS` is valid inside a multi-role array. The rule matches both unauthenticated visitors and any authenticated role listed alongside it.

```ts
import { ANONYMOUS, createPermit } from '@vielzeug/permit';

const permit = createPermit([
  { role: [ANONYMOUS, 'viewer'], resource: 'posts', action: 'read', effect: 'allow' },
]);

permit.can(null, 'posts', 'read');                             // true — anonymous
permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read'); // true
permit.can({ id: 'u2', roles: ['editor'] }, 'posts', 'read'); // false — editor not listed
```

#### With Priority and WILDCARD

A multi-role rule scores as specific (score 1) unless the array contains `WILDCARD`. At equal priority, a multi-role allow beats a `WILDCARD` deny.

```ts
import { WILDCARD, createPermit } from '@vielzeug/permit';

const permit = createPermit([
  { role: WILDCARD,             resource: 'posts', action: 'read', effect: 'deny',  priority: 0 },
  { role: ['viewer', 'editor'], resource: 'posts', action: 'read', effect: 'allow', priority: 0 },
]);

permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read'); // true — specific rule wins
permit.can({ id: 'u2', roles: ['guest'] },  'posts', 'read'); // false — wildcard deny applies
```

### Pitfalls

- An authenticated principal is never matched by `ANONYMOUS` alone. If you want a rule to apply to all users (anonymous and authenticated), combine `ANONYMOUS` with `WILDCARD` is not supported — use two separate rules instead.
- `role: []` is invalid and throws at `createPermit()` time. Always supply at least one role string.

### Related

- [Blog Roles](./blog-roles.md)
- [Inheritance and Overrides](./inheritance-and-overrides.md)

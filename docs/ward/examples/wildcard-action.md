---
title: 'Ward Examples — Wildcard Action'
description: 'Wildcard action example for @vielzeug/ward.'
---

## Wildcard Action

### Problem

You want to grant a role full access to all actions on a resource without listing every action name individually. The action set may change over time and you do not want to update the rules each time.

### Solution

Use `WILDCARD` as the `action` value. To enumerate which concrete actions are currently allowed, pass `knownActions` to `allowedActions()`.

```ts
import { WILDCARD, createWard } from '@vielzeug/ward';

const ward = createWard<'read' | 'update' | 'delete'>([
  { role: 'admin', resource: 'posts', action: WILDCARD, effect: 'allow' },
]);

// All concrete checks pass for admin
ward.explain({ id: 'u1', roles: ['admin'] }, 'posts', 'read').allowed; // true
ward.explain({ id: 'u1', roles: ['admin'] }, 'posts', 'delete').allowed; // true
ward.explain({ id: 'u1', roles: ['admin'] }, 'posts', 'archive').allowed; // true — any string action matches

// Enumerate allowed actions against a known set
ward.allowedActions({ id: 'u1', roles: ['admin'] }, 'posts', ['read', 'update', 'delete']); // ['read', 'update', 'delete']
```

### Pitfalls

- `allowedActions()` returns only what you pass in `knownActions` — it cannot discover arbitrary action names from the rule. If you check `'archive'` in `knownActions` and the wildcard rule matches, `'archive'` will be included; if you do not pass it, it will not appear.
- A wildcard-action rule scores lower on specificity than an exact-action rule at the same priority. An explicit `{ action: 'delete', effect: 'deny' }` at the same priority will override the wildcard allow for that action.

### Related

- [Blog Roles](./blog-roles.md)
- [Inheritance and Overrides](./inheritance-and-overrides.md)
- [Bound Guard in UI Layer](./bound-guard-in-ui-layer.md)

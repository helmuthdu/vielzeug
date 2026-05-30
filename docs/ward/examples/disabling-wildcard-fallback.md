---
title: 'Ward Examples — Rule Specificity'
description: 'Rule specificity example for @vielzeug/ward.'
---

## Rule Specificity

### Problem

You have a wildcard-resource allow rule and want a specific resource to override it with a deny, without having to raise the priority of the deny rule above every other rule in the set.

### Solution

At equal priority, Ward picks the more specific rule. An exact resource (`'posts'`) scores higher than `WILDCARD`, so the specific deny wins without any explicit priority setting.

```ts
import { WILDCARD, createWard } from '@vielzeug/ward';

const ward = createWard([
  // Broad allow: editor can read any resource
  { role: 'editor', resource: WILDCARD, action: 'read', effect: 'allow', priority: 10 },
  // Specific deny: posts are off-limits for reading
  { role: 'editor', resource: 'posts',  action: 'read', effect: 'deny',  priority: 10 },
]);

// Specific rule wins at equal priority
ward.can({ id: 'u1', roles: ['editor'] }, 'posts',    'read'); // false
ward.can({ id: 'u1', roles: ['editor'] }, 'comments', 'read'); // true
```

### Pitfalls

- Specificity is a tiebreaker, not a primary sort key. If the deny rule had a lower priority than the allow rule it would lose regardless of specificity.
- A multi-role rule using an array of non-wildcard roles scores the same as a single-role rule (`roleScore = 1`). Only `WILDCARD` in the roles list reduces the score to 0.

### Related

- [Inheritance and Overrides](./inheritance-and-overrides.md)
- [Wildcard Action](./wildcard-action.md)

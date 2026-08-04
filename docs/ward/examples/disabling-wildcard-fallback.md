---
title: 'Ward Examples — Rule Specificity'
description: 'Use an exact resource rule to override an equally prioritized wildcard rule.'
---

## Rule Specificity

### Problem

Allow a broad action across resources while denying the same action for one sensitive resource.

### Solution

Give the broad wildcard and exact rule the same priority; Ward selects the more specific resource rule.

```ts
import { WILDCARD, createWard } from '@vielzeug/ward';

const ward = createWard([
  { role: 'editor', resource: WILDCARD, action: 'read', effect: 'allow', priority: 10 },
  { role: 'editor', resource: 'posts', action: 'read', effect: 'deny', priority: 10 },
]);

ward.explain({ principal: { id: 'u1', roles: ['editor'] }, resource: 'posts', action: 'read' }).allowed; // false
ward.explain({ principal: { id: 'u1', roles: ['editor'] }, resource: 'comments', action: 'read' }).allowed; // true
```

### Pitfalls

- Priority is considered before specificity; a higher-priority wildcard still wins.
- This is not a configurable wildcard fallback switch; it follows Ward's normal precedence rules.

### Related

- [Wildcard Action](./wildcard-action.md)
- [Priority and Overrides](./inheritance-and-overrides.md)
- [Trace a Decision](./trace-decision.md)

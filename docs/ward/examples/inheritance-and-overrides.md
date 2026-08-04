---
title: 'Ward Examples — Priority and Overrides'
description: 'Use rule priority to override a broad staff permission for suspended users.'
---

## Priority and Overrides

### Problem

Suspend a user without removing their broader staff role or rewriting every staff rule.

### Solution

Add a more specific deny rule with a higher priority than the normal staff allow rule.

```ts
import { createWard } from '@vielzeug/ward';

const ward = createWard([
  { role: 'staff', resource: 'posts', action: 'read', effect: 'allow', priority: 10 },
  { role: 'suspended', resource: 'posts', action: 'read', effect: 'deny', priority: 100 },
]);

ward.explain({ principal: { id: 'u1', roles: ['staff', 'suspended'] }, resource: 'posts', action: 'read' }).allowed; // false
ward.explain({ principal: { id: 'u2', roles: ['staff'] }, resource: 'posts', action: 'read' }).allowed; // true
```

### Pitfalls

- Higher priority wins before effect; deny only breaks otherwise equal precedence.
- Keep priority values intentional and documented rather than relying on declaration order.

### Related

- [Rule Specificity](./disabling-wildcard-fallback.md)
- [Trace a Decision](./trace-decision.md)
- [Conflict Detection](./conflict-detection.md)

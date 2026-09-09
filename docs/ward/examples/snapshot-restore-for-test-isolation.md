---
title: 'Ward Examples — Immutable Test Policies'
description: 'Verify isolated authorization behavior with immutable policy snapshots.'
---

## Immutable Test Policies

### Problem

Authorization tests must not change when shared setup objects mutate.

### Solution

Create a Ward from authored rules; Ward snapshots and freezes its policy.

```ts
import { allow, createWard } from '@vielzeug/ward';

const roles = ['viewer'];
const ward = createWard([allow(roles, 'posts', ['read'])]);

roles[0] = 'editor';

const decision = ward.decide({
  action: 'read',
  principal: { id: 'u1', roles: ['viewer'] },
  resource: 'posts',
});

expect(decision.effect).toBe('allow');
expect(Object.isFrozen(ward.rules[0])).toBe(true);
```

### Pitfalls

Condition functions can still close over application-owned mutable state. Keep conditions pure when policy stability matters.

### Related

- [Blog roles](./blog-roles.md)
- [Review rule order](./conflict-detection.md)

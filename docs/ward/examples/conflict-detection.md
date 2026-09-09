---
title: 'Ward Examples — Review Rule Order'
description: 'Test ordered policies for shadowed rules.'
---

## Review Rule Order

### Problem

Broad rules can make later exceptions unreachable.

### Solution

Ward intentionally has no conflict engine: conditions can make static shadow analysis misleading. Test important order explicitly.

```ts
import { allow, createWard, deny, WILDCARD } from '@vielzeug/ward';

const ward = createWard([
  deny('blocked', WILDCARD, [WILDCARD]),
  allow(WILDCARD, 'posts', ['read']),
]);

const blocked = { id: 'u1', roles: ['blocked'] };
expect(ward.decide({ action: 'read', principal: blocked, resource: 'posts' }).effect).toBe('deny');
```

### Pitfalls

Static analysis cannot prove arbitrary conditions; cover order with policy tests.

### Related

- [Ordered overrides](./inheritance-and-overrides.md)

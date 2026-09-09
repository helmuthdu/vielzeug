---
title: 'Ward Examples — Ordered Overrides'
description: 'Express authorization overrides through rule order.'
---

## Ordered Overrides

### Problem

A suspended role must override a broader staff role.

### Solution

A suspended-user deny must appear before the normal staff allow.

```ts
import { allow, createWard, deny } from '@vielzeug/ward';

const ward = createWard([
  deny('suspended', 'posts', ['read']),
  allow('staff', 'posts', ['read']),
]);

ward.decide({ action: 'read', principal: { id: 'u1', roles: ['staff', 'suspended'] }, resource: 'posts' }).effect; // deny
ward.decide({ action: 'read', principal: { id: 'u2', roles: ['staff'] }, resource: 'posts' }).effect; // allow
```

### Pitfalls

There is no priority score; declaration order is the complete precedence model.

### Related

- [Wildcard exceptions](./disabling-wildcard-fallback.md)

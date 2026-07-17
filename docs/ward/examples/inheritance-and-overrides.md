---
title: 'Ward Examples — Priority and Overrides'
description: 'Priority and overrides example for @vielzeug/ward.'
---

## Priority and Overrides

```ts
import { createWard } from '@vielzeug/ward';

const ward = createWard([
  { role: 'staff', resource: 'posts', action: 'read', effect: 'allow', priority: 10 },
  { role: 'suspended', resource: 'posts', action: 'read', effect: 'deny', priority: 100 },
]);

ward.explain({ principal: { id: 'u1', roles: ['staff', 'suspended'] }, resource: 'posts', action: 'read' }).allowed; // false
ward.explain({ principal: { id: 'u2', roles: ['staff'] }, resource: 'posts', action: 'read' }).allowed; // true
```

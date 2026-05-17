---
title: 'Permit Examples — Priority and Overrides'
description: 'Model inheritance-like behavior with explicit priorities and deterministic outcomes.'
---

## Priority and Overrides

`permit` uses explicit priorities instead of role inheritance chains.

```ts
import { createPermit } from '@vielzeug/permit';

const permit = createPermit([
  { role: 'staff', resource: 'posts', action: 'read', effect: 'allow', priority: 10 },
  { role: 'suspended', resource: 'posts', action: 'read', effect: 'deny', priority: 100 },
]);

// The result is deterministic regardless of role array ordering.
permit.can({ id: 'u1', roles: ['staff', 'suspended'] }, 'posts', 'read'); // false
permit.can({ id: 'u1', roles: ['suspended', 'staff'] }, 'posts', 'read'); // false
```

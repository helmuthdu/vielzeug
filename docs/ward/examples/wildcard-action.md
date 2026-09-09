---
title: 'Ward Examples — Wildcard Action'
description: 'Grant every action with a wildcard helper rule.'
---

## Wildcard Action

### Problem

An administrator needs every action on one resource.

### Solution

```ts
import { allow, createWard, WILDCARD } from '@vielzeug/ward';

const ward = createWard([
  allow('admin', 'posts', [WILDCARD]),
]);

const admin = { id: 'u1', roles: ['admin'] };
ward.decide({ action: 'read', principal: admin, resource: 'posts' }).effect; // allow
ward.decide({ action: 'delete', principal: admin, resource: 'posts' }).effect; // allow
```

### Pitfalls

Ward does not infer a finite action universe; enumerate actions in the application when rendering permission lists.

### Related

- [Multi-role rules](./multi-role-rules.md)

---
title: 'Ward Examples — Wildcard Action'
description: 'Wildcard action example for @vielzeug/ward.'
---

## Wildcard Action

```ts
import { WILDCARD, createWard } from '@vielzeug/ward';

const ward = createWard<'read' | 'update' | 'delete'>([
  { role: 'admin', resource: 'posts', action: WILDCARD, effect: 'allow' },
]);

ward.explain({ principal: { id: 'u1', roles: ['admin'] }, resource: 'posts', action: 'read' }).allowed; // true
ward.explain({ principal: { id: 'u1', roles: ['admin'] }, resource: 'posts', action: 'delete' }).allowed; // true

const actions = ward.allowedActions({
  principal: { id: 'u1', roles: ['admin'] },
  resource: 'posts',
  knownActions: ['read', 'update', 'delete'] as const,
});
```

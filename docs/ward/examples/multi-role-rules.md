---
title: 'Ward Examples — Multi-Role Rules'
description: 'Multi-role rules example for @vielzeug/ward.'
---

## Multi-Role Rules

```ts
import { ANONYMOUS, createWard } from '@vielzeug/ward';

const ward = createWard<'read' | 'update' | 'delete'>([
  { role: ['viewer', 'editor', 'admin'], resource: 'posts', action: 'read', effect: 'allow' },
  { role: ['editor', 'admin'], resource: 'posts', action: 'update', effect: 'allow' },
  { role: 'admin', resource: 'posts', action: 'delete', effect: 'allow' },
  { role: [ANONYMOUS, 'viewer'], resource: 'landing', action: 'read', effect: 'allow' },
]);

ward.explain({ principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts', action: 'read' }).allowed; // true
ward.explain({ principal: { id: 'u2', roles: ['editor'] }, resource: 'posts', action: 'update' }).allowed; // true
ward.explain({ principal: { id: 'u3', roles: ['admin'] }, resource: 'posts', action: 'delete' }).allowed; // true
ward.explain({ principal: null, resource: 'landing', action: 'read' }).allowed; // true
```

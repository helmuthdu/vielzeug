---
title: 'Ward Examples — Blog Roles'
description: 'Blog roles example for @vielzeug/ward.'
---

## Blog Roles

```ts
import { ANONYMOUS, createWard, owns } from '@vielzeug/ward';

const ward = createWard<'read' | 'create' | 'update' | 'delete', { authorId: string }>([
  { role: ANONYMOUS, resource: 'posts', action: 'read', effect: 'allow' },
  { role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' },
  { role: 'editor', resource: 'posts', action: 'create', effect: 'allow' },
  { role: 'editor', resource: 'posts', action: 'update', effect: 'allow', when: owns('authorId') },
  { role: 'admin', resource: 'posts', action: 'delete', effect: 'allow' },
]);

ward.explain({ principal: null, resource: 'posts', action: 'read' }).allowed; // true
ward.explain({
  principal: { id: 'u1', roles: ['editor'] },
  resource: 'posts',
  action: 'update',
  data: { authorId: 'u1' },
}).allowed; // true
ward.explain({
  principal: { id: 'u1', roles: ['editor'] },
  resource: 'posts',
  action: 'update',
  data: { authorId: 'u2' },
}).allowed; // false
ward.explain({ principal: { id: 'u2', roles: ['admin'] }, resource: 'posts', action: 'delete' }).allowed; // true
```

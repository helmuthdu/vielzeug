---
title: 'Ward Examples — Blog Roles'
description: 'Build a blog authorization policy for anonymous, viewer, editor, and admin roles.'
---

## Blog Roles

### Problem

Model read, create, update, and delete permissions for a blog without scattering role checks through handlers.

### Solution

Define immutable role rules once, then ask Ward for an explained decision at each authorization boundary.

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
```

### Pitfalls

- Pass resource data for ownership predicates; omitted data cannot satisfy `owns()`.
- Model default-deny explicitly by adding only allowed rules.

### Related

- [Multi-Role Rules](./multi-role-rules.md)
- [Wildcard Action](./wildcard-action.md)
- [Trace a Decision](./trace-decision.md)

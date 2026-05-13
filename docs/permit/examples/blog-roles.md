---
title: 'Permit Examples — Blog Roles'
description: 'Build blog permissions with allow/deny rules, ownership checks, and anonymous read access.'
---

## Blog Roles

```ts
import { ANONYMOUS, createPermit, owns } from '@vielzeug/permit';

const permit = createPermit<'read' | 'create' | 'update' | 'delete', { authorId: string }>([
  { role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' },
  { role: 'editor', resource: 'posts', action: 'create', effect: 'allow' },
  {
    role: 'editor',
    resource: 'posts',
    action: 'update',
    effect: 'allow',
    when: owns('authorId'),
  },
  { role: 'admin', resource: 'posts', action: 'delete', effect: 'allow' },
  { role: ANONYMOUS, resource: 'posts', action: 'read', effect: 'allow' },
]);

permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u1' });
permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u2' });
permit.can(null, 'posts', 'read');

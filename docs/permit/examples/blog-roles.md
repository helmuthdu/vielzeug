---
title: 'Permit Examples — Blog Roles'
description: 'Build blog permissions with allow/deny rules, ownership checks, and anonymous read access.'
---

## Blog Roles

```ts
import { ANONYMOUS, createPermit, owns } from '@vielzeug/permit';

const permit = createPermit<'read' | 'create' | 'update' | 'delete', { authorId: string }>();

permit
  .set({ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' })
  .set({ role: 'editor', resource: 'posts', action: 'create', effect: 'allow' })
  .set({
    role: 'editor',
    resource: 'posts',
    action: 'update',
    effect: 'allow',
    when: owns('authorId'),
  })
  .set({ role: 'admin', resource: 'posts', action: 'delete', effect: 'allow' })
  .set({ role: ANONYMOUS, resource: 'posts', action: 'read', effect: 'allow' });

permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u1' });
permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'update', { authorId: 'u2' });
permit.can(null, 'posts', 'read');

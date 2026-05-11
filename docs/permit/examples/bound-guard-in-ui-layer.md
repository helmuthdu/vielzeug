---
title: 'Permit Examples — Bound Checker in UI Layer'
description: 'Bind the current user once and reuse permission checks in a UI module.'
---

## Bound Checker in UI Layer

```ts
import { createPermit } from '@vielzeug/permit';

const permit = createPermit();

permit
  .set({ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' })
  .set({ role: 'editor', resource: 'posts', action: 'update', effect: 'allow' });

export function usePostActions(user: { id: string; roles: string[] }) {
  const bound = permit.forUser(user, true);

  return {
    actions: bound.allowedActions('posts'),
    canRead: bound.can('posts', 'read'),
    canUpdate: bound.can('posts', 'update'),
    canDelete: bound.can('posts', 'delete'),
    explainDelete: bound.explain('posts', 'delete'),
  };
}
```

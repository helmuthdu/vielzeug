---
title: 'Ward Examples — Bound Guard in UI Layer'
description: 'Bound guard in UI layer example for @vielzeug/ward.'
---

## Bound Guard in UI Layer

```ts
import { createWard } from '@vielzeug/ward';

const ward = createWard([
  { role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' },
  { role: 'editor', resource: 'posts', action: 'update', effect: 'allow' },
]);

const KNOWN_ACTIONS = ['read', 'update', 'delete'] as const;

export function usePostActions(user: { id: string; roles: string[] }) {
  const bound = ward.forUser(user);

  return {
    actions: bound.allowedActions({ resource: 'posts', knownActions: KNOWN_ACTIONS }),
    canRead: bound.explain({ resource: 'posts', action: 'read' }).allowed,
    canUpdate: bound.explain({ resource: 'posts', action: 'update' }).allowed,
    canDelete: bound.explain({ resource: 'posts', action: 'delete' }).allowed,
  };
}
```

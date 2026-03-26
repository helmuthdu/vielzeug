# Bound Guard in UI Layer

```ts
import { createPermit } from '@vielzeug/permit';

const permit = createPermit();

permit
  .set({ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' })
  .set({ role: 'editor', resource: 'posts', action: 'update', effect: 'allow' });

export function usePostActions(user: { id: string; roles: string[] }) {
  const guard = permit.withUser(user);

  return {
    canRead: guard.can('posts', 'read'),
    canUpdate: guard.can('posts', 'update'),
    canDelete: guard.can('posts', 'delete'),
  };
}
```

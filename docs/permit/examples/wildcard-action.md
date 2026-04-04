# Wildcard Action

```ts
import { WILDCARD, createPermit } from '@vielzeug/permit';

const permit = createPermit();

permit.set({
  role: 'admin',
  resource: 'posts',
  action: WILDCARD,
  effect: 'allow',
});

permit.can({ id: 'u1', roles: ['admin'] }, 'posts', 'read');
permit.can({ id: 'u1', roles: ['admin'] }, 'posts', 'delete');
permit.can({ id: 'u1', roles: ['admin'] }, 'posts', 'archive');
```

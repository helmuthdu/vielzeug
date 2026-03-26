# Logger for Auditing

```ts
import { createPermit } from '@vielzeug/permit';

const audit: string[] = [];

const permit = createPermit({
  logger: (result, principal, resource, action) => {
    const identity = principal.kind === 'anonymous' ? 'anonymous' : principal.id;
    audit.push(`${identity}:${resource}:${action}:${result}`);
  },
});

permit.set({ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' });

permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');
permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'delete');
```

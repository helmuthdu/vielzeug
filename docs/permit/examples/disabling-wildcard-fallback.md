# Rule Specificity

`permit` no longer uses wildcard fallback modes. Use priority and specificity directly.

```ts
import { WILDCARD, createPermit } from '@vielzeug/permit';

const permit = createPermit();

permit
  .set({ role: 'editor', resource: WILDCARD, action: 'read', effect: 'allow', priority: 10 })
  .set({ role: 'editor', resource: 'posts', action: 'read', effect: 'deny', priority: 10 });

// Same priority: exact resource wins over wildcard resource.
permit.can({ id: 'u1', roles: ['editor'] }, 'posts', 'read'); // false
permit.can({ id: 'u1', roles: ['editor'] }, 'comments', 'read'); // true
```

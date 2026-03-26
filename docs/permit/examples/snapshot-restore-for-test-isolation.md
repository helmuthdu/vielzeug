# Policy Export/Import for Test Isolation

```ts
import { createPermit } from '@vielzeug/permit';

const permit = createPermit();

permit.set({ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' });

const policy = permit.exportPolicy();

beforeEach(() => {
  permit.importPolicy(policy);
});

afterEach(() => {
  permit.clear();
});
```

---
title: 'Permit Examples — Fresh Permit Per Test'
description: 'Use a permit factory to keep tests isolated and deterministic with immutable rules.'
---

## Fresh Permit Per Test

```ts
import { createPermit } from '@vielzeug/permit';

function createTestPermit() {
  return createPermit([{ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' }]);
}

let permit = createTestPermit();

beforeEach(() => {
  permit = createTestPermit();
});

permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read');
```

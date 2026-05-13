---
title: 'Permit Examples — Fresh Permit Per Test'
description: 'Create a new immutable permit per test to keep rule setup isolated and deterministic.'
---

## Fresh Permit Per Test

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createPermit } from '@vielzeug/permit';

function createTestPermit() {
  return createPermit([{ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' }]);
}

describe('post permissions', () => {
  let permit = createTestPermit();

  beforeEach(() => {
    permit = createTestPermit();
  });

  it('allows viewers to read posts', () => {
    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read')).toBe(true);
  });
});
```

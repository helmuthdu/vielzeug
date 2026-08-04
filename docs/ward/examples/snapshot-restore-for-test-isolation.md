---
title: 'Ward Examples — Fresh Ward Per Test'
description: 'Create a fresh immutable Ward policy for each Vitest test.'
---

## Fresh Ward Per Test

### Problem

Keep authorization tests isolated without relying on a mutable policy reset or a nonexistent snapshot API.

### Solution

Create the immutable Ward policy in a small factory and call it before each test.

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createWard } from '@vielzeug/ward';

function createTestWard() {
  return createWard([{ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' }]);
}

describe('post permissions', () => {
  let ward = createTestWard();

  beforeEach(() => {
    ward = createTestWard();
  });

  it('allows viewers to read posts', () => {
    expect(
      ward.explain({ principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts', action: 'read' }).allowed,
    ).toBe(true);
  });

  it('denies viewer delete', () => {
    expect(
      ward.explain({ principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts', action: 'delete' }).allowed,
    ).toBe(false);
  });
});
```

### Pitfalls

- Ward rules are immutable; create a new Ward instead of treating it as mutable policy state.
- Keep test fixtures local so changing one test's input does not affect another.

### Related

- [Blog Roles](./blog-roles.md)
- [Conflict Detection](./conflict-detection.md)
- [Ward Usage Guide](../usage.md)

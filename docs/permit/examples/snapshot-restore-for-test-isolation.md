---
title: 'Permit Examples — Fresh Permit Per Test'
description: 'Fresh permit per test example for @vielzeug/permit.'
---

## Fresh Permit Per Test

### Problem

Tests that share a single `createPermit()` call can interfere with each other if one test's expectations depend on the initial rule set while another modifies the instance. You want each test to start from a clean, predictable state.

### Solution

Because `createPermit()` is synchronous and cheap, call it inside a `beforeEach` block to create a fresh instance per test. There is no snapshot-and-restore mechanism — immutability means a new instance _is_ the clean state.

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createPermit } from '@vielzeug/permit';

function createTestPermit() {
  return createPermit([{ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' }]);
}

describe('post permissions', () => {
  let permit = createTestPermit();

  beforeEach(() => {
    // Each test gets an independent instance
    permit = createTestPermit();
  });

  it('allows viewers to read posts', () => {
    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'read')).toBe(true);
  });

  it('denies viewers to delete posts', () => {
    expect(permit.can({ id: 'u1', roles: ['viewer'] }, 'posts', 'delete')).toBe(false);
  });
});
```

### Pitfalls

- Sharing one permit instance across test files via a module-level `const` is fine as long as all tests treat it as read-only. Defining rules at module scope and checking decisions in tests is the most common correct pattern.
- Avoid constructing the permit inside individual `it` blocks when multiple tests share the same rule set — prefer `beforeEach` to keep test bodies focused on assertions.

### Related

- [Blog Roles](./blog-roles.md)
- [Logger for Auditing](./logger-for-auditing.md)

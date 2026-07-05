---
title: 'Ward Examples — Fresh Ward Per Test'
description: 'Fresh ward per test example for @vielzeug/ward.'
---

## Fresh Ward Per Test

### Problem

Tests that share a single `createWard()` call can interfere with each other if one test's expectations depend on the initial rule set while another modifies the instance. You want each test to start from a clean, predictable state.

### Solution

Because `createWard()` is synchronous and cheap, call it inside a `beforeEach` block to create a fresh instance per test. There is no snapshot-and-restore mechanism — immutability means a new instance _is_ the clean state.

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createWard } from '@vielzeug/ward';

function createTestWard() {
  return createWard([{ role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' }]);
}

describe('post permissions', () => {
  let ward = createTestWard();

  beforeEach(() => {
    // Each test gets an independent instance
    ward = createTestWard();
  });

  it('allows viewers to read posts', () => {
    expect(ward.explain({ id: 'u1', roles: ['viewer'] }, 'posts', 'read').allowed).toBe(true);
  });

  it('denies viewers to delete posts', () => {
    expect(ward.explain({ id: 'u1', roles: ['viewer'] }, 'posts', 'delete').allowed).toBe(false);
  });
});
```

### Pitfalls

- Sharing one ward instance across test files via a module-level `const` is fine as long as all tests treat it as read-only. Defining rules at module scope and checking decisions in tests is the most common correct pattern.
- Avoid constructing the ward inside individual `it` blocks when multiple tests share the same rule set — prefer `beforeEach` to keep test bodies focused on assertions.

### Related

- [Blog Roles](./blog-roles.md)
- [Logger for Auditing](./logger-for-auditing.md)

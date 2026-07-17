---
title: 'Ward Examples — Fresh Ward Per Test'
description: 'Fresh ward per test example for @vielzeug/ward.'
---

## Fresh Ward Per Test

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
    expect(ward.explain({ principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts', action: 'read' }).allowed).toBe(true);
  });

  it('denies viewer delete', () => {
    expect(ward.explain({ principal: { id: 'u1', roles: ['viewer'] }, resource: 'posts', action: 'delete' }).allowed).toBe(false);
  });
});
```

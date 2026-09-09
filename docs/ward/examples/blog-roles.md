---
title: 'Ward Examples — Blog Roles'
description: 'Build an ordered blog authorization policy.'
---

## Blog Roles

### Problem

Authorization checks are scattered through blog handlers.

### Solution

Use helper-generated role rules and put exceptional denies first.

```ts
import { ANONYMOUS, allow, createWard, deny, predicate, WILDCARD } from '@vielzeug/ward';

const ward = createWard([
  deny('blocked', WILDCARD, [WILDCARD]),
  allow(ANONYMOUS, 'posts', ['read']),
  allow('viewer', 'posts', ['read']),
  allow('editor', 'posts', ['create']),
  allow('editor', 'posts', ['update'], { when: predicate.owns('authorId') }),
  allow('admin', 'posts', ['delete']),
]);

ward.decide({ action: 'update', attributes: { authorId: 'u1' }, principal: { id: 'u1', roles: ['editor'] }, resource: 'posts' }).effect; // allow
```

### Pitfalls

Pass ownership data through `attributes`. No match means deny.

### Related

- [Multi-role rules](./multi-role-rules.md)

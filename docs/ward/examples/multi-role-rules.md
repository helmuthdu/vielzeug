---
title: 'Ward Examples — Multi-Role Rules'
description: 'Grant one permission to several roles.'
---

## Multi-Role Rules

### Problem

Several roles share the same permission.

### Solution

Pass a role array to `allow()` or `deny()`.

```ts
import { allow, ANONYMOUS, createWard } from '@vielzeug/ward';

const ward = createWard([
  allow(['viewer', 'editor', 'admin'], 'posts', ['read']),
  allow(['editor', 'admin'], 'posts', ['update']),
  allow('admin', 'posts', ['delete']),
  allow(ANONYMOUS, 'landing', ['read']),
]);
```

### Pitfalls

Role arrays use OR semantics. Normal first-match ordering still applies between generated rules.

### Related

- [Blog roles](./blog-roles.md)

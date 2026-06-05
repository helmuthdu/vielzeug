---
title: 'Arsenal Examples — uuid'
description: 'uuid example for @vielzeug/arsenal.'
---

## uuid

### Problem

You need a random UUID v4 — for example generating unique IDs for new entities before persisting them.

### Solution

Use `uuid()` as a thin wrapper around `crypto.randomUUID()`.

```ts
import { uuid } from '@vielzeug/arsenal';

uuid(); // e.g. '110e8400-e29b-41d4-a716-446655440000'

const newUser = { id: uuid(), name: 'Alice' };
```

### Pitfalls

- Requires the Web Crypto API (`crypto.randomUUID`). Available in all modern browsers and Node.js ≥ 19. In older Node.js versions use `require('crypto').randomUUID()` directly.

### Related

- [random](./random.md)

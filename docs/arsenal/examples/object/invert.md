---
title: 'Arsenal Examples — invert'
description: 'invert example for @vielzeug/arsenal.'
---

## invert

### Problem

You need a reverse lookup map — swapping keys and values of an object so you can look up a key by its value.

### Solution

Use `invert(obj)` to swap keys and values. Values become keys and keys become values.

```ts
import { invert } from '@vielzeug/arsenal';

const roles = { 1: 'admin', 2: 'user', 3: 'guest' };
invert(roles);
// { admin: '1', user: '2', guest: '3' }
```

### Pitfalls

- If multiple keys share the same value, only one is kept — last wins.
- All resulting keys are strings (values are coerced).

### Related

- [mapKeys](./mapKeys.md)
- [entries](./entries.md)

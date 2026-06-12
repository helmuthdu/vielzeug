---
title: 'Arsenal Examples — omit'
description: 'omit example for @vielzeug/arsenal.'
---

## omit

### Problem

You need to create a copy of an object with certain keys removed — for example stripping `password` before returning a user record.

### Solution

Use `omit(obj, keys)` to return a new object without the specified keys.

```ts
import { omit } from '@vielzeug/arsenal';

const user = { id: 1, name: 'Alice', password: 'secret', role: 'admin' };
omit(user, ['password']);
// { id: 1, name: 'Alice', role: 'admin' }
```

### Pitfalls

- Returns a shallow copy — nested values are not cloned.
- For the inverse (keep a subset of keys), use `pick`.

### Related

- [pick](./pick.md)
- [filterValues](./filterValues.md)

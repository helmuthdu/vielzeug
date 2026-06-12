---
title: 'Arsenal Examples — pick'
description: 'pick example for @vielzeug/arsenal.'
---

## pick

### Problem

You need a subset of an object's keys — for example extracting only the public fields from a user record before sending a response.

### Solution

Use `pick(obj, keys)` to return a new object containing only the specified keys.

```ts
import { pick } from '@vielzeug/arsenal';

const user = { id: 1, name: 'Alice', password: 'secret', role: 'admin' };
pick(user, ['id', 'name']);
// { id: 1, name: 'Alice' }
```

### Pitfalls

- Returns a shallow copy — nested values are not cloned.
- Keys not present in the object are silently ignored.

### Related

- [omit](./omit.md)
- [mapValues](./mapValues.md)

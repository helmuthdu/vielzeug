---
title: 'Arsenal Examples — isMatch'
description: 'isMatch example for @vielzeug/arsenal.'
---

## isMatch

### Problem

You need partial structural matching — checking that an object contains at least the keys and values of a source, without requiring exact equality.

### Solution

Use `isMatch(object, source)` to confirm that `object` has every key-value from `source` (recursively).

```ts
import { isMatch } from '@vielzeug/arsenal';

const user = { id: 1, name: 'Alice', role: 'admin', active: true };

isMatch(user, { role: 'admin' });          // true
isMatch(user, { role: 'admin', active: true }); // true
isMatch(user, { role: 'user' });           // false
```

### Pitfalls

- `Map` and `Set` sources always return `false` — use `isEqual` for those types.
- Only checks keys present in `source` — extra keys in `object` are ignored.

### Related

- [isEqual](./isEqual.md)

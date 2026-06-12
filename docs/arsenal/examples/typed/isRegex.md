---
title: 'Arsenal Examples — isRegex'
description: 'isRegex example for @vielzeug/arsenal.'
---

## isRegex

### Problem

You need to check whether a value is a `RegExp` instance — for example validating a config option that accepts either a string pattern or a compiled regex.

### Solution

Use `isRegex(value)` to narrow to `RegExp`.

```ts
import { isRegex } from '@vielzeug/arsenal';

function toRegex(pattern: string | RegExp): RegExp {
  return isRegex(pattern) ? pattern : new RegExp(pattern);
}
```

### Related

- [isString](./isString.md)

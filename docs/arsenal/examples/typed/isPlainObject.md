---
title: 'Arsenal Examples — isPlainObject'
description: 'isPlainObject example for @vielzeug/arsenal.'
---

## isPlainObject

### Problem

You need to distinguish plain data objects from class instances, arrays, and built-ins — for example deciding whether to deep-merge or use as-is.

### Solution

Use `isPlainObject(value)` to narrow to `Record<string, unknown>`. Returns `true` only for objects with `Object.prototype` or `null` prototype.

```ts
import { isPlainObject } from '@vielzeug/arsenal';

isPlainObject({});              // true
isPlainObject({ a: 1 });        // true
isPlainObject(Object.create(null)); // true

isPlainObject([]);              // false — array
isPlainObject(new Date());      // false — class instance
isPlainObject(null);            // false
```

### Related

- [isArray](./isArray.md)
- [isNil](./isNil.md)

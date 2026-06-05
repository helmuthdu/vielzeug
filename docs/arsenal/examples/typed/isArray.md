---
title: 'Arsenal Examples — isArray'
description: 'isArray example for @vielzeug/arsenal.'
---

## isArray

### Problem

You need to check whether a value is an array, optionally narrowing the item type with a guard.

### Solution

Use `isArray(value, itemGuard?)` to guard array type. Without `itemGuard` it checks `Array.isArray`; with one it also narrows the element type.

```ts
import { isArray, isString } from '@vielzeug/arsenal';

isArray([1, 2, 3]);         // true
isArray('not an array');    // false

if (isArray(value, isString)) {
  value; // string[]
}
```

### Related

- [isPlainObject](./isPlainObject.md)
- [isEmpty](./isEmpty.md)

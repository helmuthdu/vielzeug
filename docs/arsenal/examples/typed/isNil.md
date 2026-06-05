---
title: 'Arsenal Examples — isNil'
description: 'isNil example for @vielzeug/arsenal.'
---

## isNil

### Problem

You need to check for both `null` and `undefined` in one guard — for example cleaning form values or skipping empty API fields.

### Solution

Use `isNil(value)` to check `value === null || value === undefined`.

```ts
import { isNil } from '@vielzeug/arsenal';

isNil(null);      // true
isNil(undefined); // true
isNil(0);         // false
isNil('');        // false
```

### Related

- [isDefined](./isDefined.md)
- [isEmpty](./isEmpty.md)

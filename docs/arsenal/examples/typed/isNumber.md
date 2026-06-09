---
title: 'Arsenal Examples — isNumber'
description: 'isNumber example for @vielzeug/arsenal.'
---

## isNumber

### Problem

You need to guard numeric values from generic inputs — for example validating config values or discriminating a union type.

### Solution

Use `isNumber(value)` to narrow to `number`.

```ts
import { isNumber } from '@vielzeug/arsenal';

isNumber(42); // true
isNumber(NaN); // true — NaN is typeof 'number'
isNumber('42'); // false
```

### Pitfalls

- `NaN` passes `isNumber` — add `&& !isNaN(value)` if you need to exclude it.

### Related

- [isString](./isString.md)
- [isPrimitive](./isPrimitive.md)

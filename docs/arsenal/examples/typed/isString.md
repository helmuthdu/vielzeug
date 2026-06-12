---
title: 'Arsenal Examples — isString'
description: 'isString example for @vielzeug/arsenal.'
---

## isString

### Problem

You need to narrow an unknown value to `string` — for example validating a query parameter or discriminating a union type.

### Solution

Use `isString(value)` to narrow to `string`.

```ts
import { isString } from '@vielzeug/arsenal';

isString('hello'); // true
isString(42); // false
isString(null); // false

const values: unknown[] = ['a', 1, 'b', null, 'c'];
values.filter(isString); // ['a', 'b', 'c']
```

### Related

- [isNumber](./isNumber.md)
- [isPrimitive](./isPrimitive.md)

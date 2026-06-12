---
title: 'Arsenal Examples — isPrimitive'
description: 'isPrimitive example for @vielzeug/arsenal.'
---

## isPrimitive

### Problem

You need to distinguish primitive values (`string`, `number`, `boolean`) from objects in a generic function.

### Solution

Use `isPrimitive(value)` to narrow to `string | number | boolean`.

```ts
import { isPrimitive } from '@vielzeug/arsenal';

isPrimitive('hello'); // true
isPrimitive(42); // true
isPrimitive(true); // true

isPrimitive(null); // false
isPrimitive({}); // false
isPrimitive([]); // false
```

### Related

- [isString](./isString.md)
- [isNumber](./isNumber.md)
- [isBoolean](./isBoolean.md)

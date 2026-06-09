---
title: 'Arsenal Examples — isBoolean'
description: 'isBoolean example for @vielzeug/arsenal.'
---

## isBoolean

### Problem

You need a type guard for `boolean` values — for example discriminating between boolean flags and other primitives in a generic input.

### Solution

Use `isBoolean(value)` to narrow the type to `boolean`.

```ts
import { isBoolean } from '@vielzeug/arsenal';

isBoolean(true); // true
isBoolean(false); // true
isBoolean(1); // false
isBoolean('true'); // false
```

### Related

- [isPrimitive](./isPrimitive.md)
- [isDefined](./isDefined.md)

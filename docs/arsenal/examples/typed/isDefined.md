---
title: 'Arsenal Examples — isDefined'
description: 'isDefined example for @vielzeug/arsenal.'
---

## isDefined

### Problem

You need to filter out `undefined` values from an array or narrow a type that includes `undefined`.

### Solution

Use `isDefined(value)` to narrow away `undefined`. Works directly as an `Array.filter` callback.

```ts
import { isDefined } from '@vielzeug/arsenal';

const values: (number | undefined)[] = [1, undefined, 2, undefined, 3];
const numbers: number[] = values.filter(isDefined);
// [1, 2, 3]
```

### Pitfalls

- Allows `null` through — use `isNil` to exclude both `null` and `undefined`.

### Related

- [isNil](./isNil.md)
- [compact](../array/compact.md)

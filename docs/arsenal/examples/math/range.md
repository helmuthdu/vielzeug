---
title: 'Arsenal Examples — range'
description: 'range example for @vielzeug/arsenal.'
---

## range

### Problem

You need to generate a sequence of integers without mutation — for example creating index arrays, building pagination controls, or driving `Array.from`.

### Solution

Use `range(stop)`, `range(start, stop)`, or `range(start, stop, step)` to produce an integer array.

```ts
import { range } from '@vielzeug/arsenal';

range(5); // [0, 1, 2, 3, 4]
range(1, 6); // [1, 2, 3, 4, 5]
range(0, 10, 2); // [0, 2, 4, 6, 8]
range(5, 0, -1); // [5, 4, 3, 2, 1]
```

### Pitfalls

- `stop` is exclusive. `range(1, 5)` returns `[1, 2, 3, 4]`, not `[1, 2, 3, 4, 5]`.

### Related

- [linspace](./linspace.md)
- [chunk](../array/chunk.md)

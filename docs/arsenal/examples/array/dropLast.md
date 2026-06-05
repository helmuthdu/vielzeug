---
title: 'Arsenal Examples — dropLast'
description: 'dropLast example for @vielzeug/arsenal.'
---

## dropLast

### Problem

You need to remove the last N items from an array — for example trimming a trailing sentinel or removing the most-recent log entries.

### Solution

Use `dropLast(array, n?)` to return a new array without the last `n` items.

```ts
import { dropLast } from '@vielzeug/arsenal';

dropLast([1, 2, 3, 4, 5], 2); // [1, 2, 3]
dropLast([1, 2, 3]);           // [1, 2]
```

### Pitfalls

- When `n` exceeds the array length, returns an empty array.

### Related

- [drop](./drop.md)
- [takeLast](./takeLast.md)

---
title: 'Arsenal Examples — unzip'
description: 'unzip example for @vielzeug/arsenal.'
---

## unzip

### Problem

You have an array of tuples and need to transpose it into separate arrays of columns — the inverse of `zip`.

### Solution

Use `unzip(rows)` to transpose a `[row, row, ...]` matrix into column arrays.

```ts
import { unzip } from '@vielzeug/arsenal';

unzip([
  ['a', 1],
  ['b', 2],
  ['c', 3],
]);
// [['a', 'b', 'c'], [1, 2, 3]]
```

### Pitfalls

- All rows must have the same length; jagged input produces `undefined` in shorter rows.

### Related

- [zip](./zip.md)

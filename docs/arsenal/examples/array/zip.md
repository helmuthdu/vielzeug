---
title: 'Arsenal Examples — zip'
description: 'zip example for @vielzeug/arsenal.'
---

## zip

### Problem

You have two or more parallel arrays and need to combine them element-by-element into tuples.

### Solution

Use `zip(...arrays)` to return an array of tuples, one per index position.

```ts
import { zip } from '@vielzeug/arsenal';

zip(['a', 'b', 'c'], [1, 2, 3]);
// [['a', 1], ['b', 2], ['c', 3]]

zip([1, 2], ['x', 'y'], [true, false]);
// [[1, 'x', true], [2, 'y', false]]
```

### Pitfalls

- Output length is the length of the shortest input array — extra elements are dropped.

### Related

- [unzip](./unzip.md)

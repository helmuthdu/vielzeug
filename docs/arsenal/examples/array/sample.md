---
title: 'Arsenal Examples — draw / drawMany'
description: 'draw and drawMany example for @vielzeug/arsenal.'
---

## draw / drawMany

### Problem

You need to pick one or several random items from an array without replacement — for example selecting a survey respondent or generating test fixtures.

### Solution

Use `draw(array)` for a single random pick or `drawMany(array, n)` for multiple picks without replacement.

```ts
import { draw, drawMany } from '@vielzeug/arsenal';

const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

draw(items);          // e.g. 7 — one random element; undefined for empty array
drawMany(items, 3);   // e.g. [7, 2, 9] — 3 unique picks
drawMany(items, 1);   // e.g. [4]
```

### Pitfalls

- `draw` returns `undefined` for an empty array; guard if the input may be empty.
- When `n` exceeds the array length, `drawMany` returns a shuffled copy of the full array.
- Uses `Math.random()` — not cryptographically secure.

### Related

- [shuffle](../random/shuffle.md)
- [random](../random/random.md)

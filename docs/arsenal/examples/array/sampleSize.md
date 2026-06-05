---
title: 'Arsenal Examples — sample'
description: 'sample example for @vielzeug/arsenal.'
---

## sample

### Problem

You need to pick N random items from an array without replacement — for example choosing survey respondents or generating test fixtures.

### Solution

Use `sample(array, n)` to return `n` randomly selected items. Each call returns a different selection.

```ts
import { sample } from '@vielzeug/arsenal';

const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

sample(items, 3); // e.g. [7, 2, 9] — different each call
sample(items, 1); // [4]
```

### Pitfalls

- When `n` exceeds the array length, returns a shuffled copy of the full array.
- Uses `Math.random()` — not cryptographically secure.

### Related

- [shuffle](../random/shuffle.md)
- [draw](../random/draw.md)

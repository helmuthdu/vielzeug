---
title: 'Arsenal Examples — shuffle'
description: 'shuffle example for @vielzeug/arsenal.'
---

## shuffle

### Problem

You need a randomly reordered copy of an array — for example randomizing a quiz question order or a playlist.

### Solution

Use `shuffle(array)` to return a new Fisher-Yates shuffled array. The original is not mutated.

```ts
import { shuffle } from '@vielzeug/arsenal';

shuffle([1, 2, 3, 4, 5]); // e.g. [3, 1, 5, 2, 4]
shuffle([1, 2, 3, 4, 5]); // e.g. [2, 4, 1, 5, 3]
```

### Pitfalls

- Returns a new array — the original is unchanged.
- Uses `Math.random()` — not cryptographically secure.

### Related

- [draw](./draw.md)
- [sample](../array/sampleSize.md)

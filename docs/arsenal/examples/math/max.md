---
title: 'Arsenal Examples — max'
description: 'max example for @vielzeug/arsenal.'
---

## max

### Problem

You need the maximum value in an array, optionally extracting a numeric field from objects.

### Solution

Use `max(array, callback?)` to return the largest value.

```ts
import { max } from '@vielzeug/arsenal';

max([3, 1, 4, 1, 5]); // 5

const scores = [{ score: 80 }, { score: 95 }, { score: 70 }];
max(scores, (s) => s.score); // 95
```

### Pitfalls

- Returns `undefined` for empty arrays.

### Related

- [min](./min.md)
- [clamp](./clamp.md)

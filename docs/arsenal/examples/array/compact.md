---
title: 'Arsenal Examples — compact'
description: 'compact example for @vielzeug/arsenal.'
---

## compact

### Problem

You have an array that may contain `null`, `undefined`, `0`, `false`, or `''` and need to drop all falsy values in one pass.

### Solution

Use `compact(array)` to return a new array with all falsy values removed.

```ts
import { compact } from '@vielzeug/arsenal';

compact([0, 1, false, 2, '', 3, null, undefined]);
// [1, 2, 3]
```

#### With typed arrays

```ts
import { compact } from '@vielzeug/arsenal';

const ids: (number | null)[] = [1, null, 2, null, 3];
const validIds: number[] = compact(ids);
// [1, 2, 3]
```

### Pitfalls

- `0`, `false`, and `''` are removed. Use `filterMap` if you need to keep some falsy values.
- Returns a new array; the original is not mutated.

### Related

- [filterMap](./select.md)
- [partition](./partition.md)

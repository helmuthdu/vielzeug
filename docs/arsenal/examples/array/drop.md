---
title: 'Arsenal Examples — drop'
description: 'drop example for @vielzeug/arsenal.'
---

## drop

### Problem

You need to skip the first N items of an array and work with the rest — for example advancing past a header row or implementing pagination.

### Solution

Use `drop(array, n?)` to return a new array with the first `n` items removed. Default is 1.

```ts
import { drop } from '@vielzeug/arsenal';

drop([1, 2, 3, 4, 5], 2); // [3, 4, 5]
drop([1, 2, 3]);            // [2, 3]
drop([1, 2, 3], 10);        // []
```

### Pitfalls

- Dropping more items than the array length returns an empty array, not an error.

### Related

- [take](./take.md)
- [dropLast](./dropLast.md)

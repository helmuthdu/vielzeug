---
title: 'Arsenal Examples — take'
description: 'take example for @vielzeug/arsenal.'
---

## take

### Problem

You need the first N items of an array — for example showing a preview or implementing a "top 5" list.

### Solution

Use `take(array, n?)` to return the first `n` items. Default is 1.

```ts
import { take } from '@vielzeug/arsenal';

take([1, 2, 3, 4, 5], 3); // [1, 2, 3]
take([1, 2, 3]); // [1]
take([1, 2, 3], 10); // [1, 2, 3]
```

### Pitfalls

- When `n` exceeds the array length, returns the full array — no error.

### Related

- [drop](./drop.md)
- [takeLast](./takeLast.md)
- [chunk](./chunk.md)

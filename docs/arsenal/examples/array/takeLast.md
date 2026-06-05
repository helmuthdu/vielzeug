---
title: 'Arsenal Examples — takeLast'
description: 'takeLast example for @vielzeug/arsenal.'
---

## takeLast

### Problem

You need the last N items from an array — for example showing the most recent log entries or the final page of paginated data.

### Solution

Use `takeLast(array, n?)` to return the last `n` items. Default is 1.

```ts
import { takeLast } from '@vielzeug/arsenal';

takeLast([1, 2, 3, 4, 5], 3); // [3, 4, 5]
takeLast([1, 2, 3]);           // [3]
```

### Pitfalls

- When `n` exceeds the array length, returns the full array.

### Related

- [last](./last.md)
- [dropLast](./dropLast.md)

---
title: 'Arsenal Examples — compare'
description: 'compare example for @vielzeug/arsenal.'
---

## compare

### Problem

You need a general-purpose two-element comparator for `Array.prototype.sort` that handles numbers, strings, and dates uniformly.

### Solution

Use `compare(a, b)` as a drop-in comparator. Returns negative, zero, or positive — same contract as `Array.prototype.sort`.

```ts
import { compare } from '@vielzeug/arsenal';

[3, 1, 4, 1, 5].sort(compare);         // [1, 1, 3, 4, 5]
['banana', 'apple'].sort(compare);      // ['apple', 'banana']
[new Date('2024'), new Date('2020')].sort(compare); // [2020, 2024]
```

### Pitfalls

- String comparison uses `localeCompare` — may return values other than `−1/0/1`, and sort order depends on the locale.
- For multi-key sorting, use `compareBy`.

### Related

- [compareBy](./compareBy.md)
- [sort](../array/sort.md)

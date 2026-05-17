---
title: partition
---

## partition

Splits an array into two arrays based on a predicate.

## Example

```ts
import { partition } from '@vielzeug/toolkit';

const [even, odd] = partition([1, 2, 3, 4, 5], (n) => n % 2 === 0);

// even: [2, 4]
// odd: [1, 3, 5]
```

## Signature

```ts
function partition<T>(array: T[], predicate: (item: T, index: number, array: T[]) => boolean): [T[], T[]];
```

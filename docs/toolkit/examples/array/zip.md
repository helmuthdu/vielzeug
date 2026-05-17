---
title: zip
---

## zip

Combines multiple arrays by index.

## Example

```ts
import { zip } from '@vielzeug/toolkit';

const pairs = zip(['a', 'b', 'c'], [1, 2], [true, false, true]);

// [
//   ['a', 1, true],
//   ['b', 2, false],
//   ['c', undefined, true],
// ]
```

## Signature

```ts
function zip<T extends readonly unknown[][]>(
  ...arrays: T
): Array<{ [K in keyof T]: T[K] extends readonly (infer U)[] ? U | undefined : never }>;
```

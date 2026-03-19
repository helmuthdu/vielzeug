<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1420_B-success" alt="Size">
</div>

# select

The `select` utility maps and filters an array in a single pass. A predicate function decides which elements are processed; elements failing the predicate are excluded from the result. When no predicate is given, `null` and `undefined` elements in the source array are automatically skipped.

## Source Code

::: details View Source Code
<<< @/../packages/toolkit/src/array/select.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Single Pass**: Map and filter in one iteration for readability and performance.
- **Flexible Predicate**: Pass an explicit predicate to control which elements are processed.
- **Nil Filtering**: Without a predicate, `null` and `undefined` source elements are automatically skipped.

## API

```ts
function select<T, R>(
  array: T[],
  callback: (item: T, index: number, array: T[]) => R,
  predicate?: (item: T, index: number, array: T[]) => boolean,
): R[];
```

### Parameters

- `array`: The input array.
- `callback`: Transformation applied to each element that passes the predicate.
- `predicate`: Optional. Filters the **input** elements before mapping. Defaults to `!isNil(element)` — skips `null` and `undefined` source values.

### Returns

A new array containing the mapped values of elements that passed the predicate.

## Examples

### Synchronous Selection

```ts
import { select } from '@vielzeug/toolkit';

const numbers = [10, 20, 30, 40];

// Double only the numbers greater than 20
const result = select(
  numbers,
  (x) => x * 2,
  (x) => x > 20,
);
// [60, 80]
```

### Asynchronous Selection

::: warning
`select` does not support async callbacks. Use `parallel` or `Promise.all` for async mapping:

```ts
import { parallel } from '@vielzeug/toolkit';

const ids = [1, 2, 3];
const details = await parallel(3, ids, async (id) => fetchUser(id));
```

:::

### Default Filtering

```ts
import { select } from '@vielzeug/toolkit';

const data = [1, null, 2, undefined, 3];

// Automatically skips the null/undefined values
const doubled = select(data, (x) => x * 2);
// [2, 4, 6]
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- The predicate filters **source elements**, not callback results. To filter `null` callback results, use `predicate` explicitly or use `Array.filter` after.
- If no predicate is provided, it uses `!isNil(element)` on the original input.

## See Also

- [toggle](./toggle.md): Add or remove an item from an array.
- [pick](./pick.md): Extract specific properties from an array of objects.

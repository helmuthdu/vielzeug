<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1420_B-success" alt="Size">
</div>

# filterMap

The `filterMap` utility maps and filters an array in a single pass. Return `undefined` from the callback to skip an item.

## Source Code

::: details View Source Code
<<< @/../packages/toolkit/src/array/filterMap.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Single Pass**: Map and filter in one iteration for readability and performance.
- **Explicit Filtering**: Return `undefined` to drop an item.

## API

```ts
function filterMap<T, R>(
  array: T[],
  callback: (item: T, index: number, array: T[]) => R | undefined,
): R[];
```

### Parameters

- `array`: The input array.
- `callback`: Transformation applied to each element. Return `undefined` to drop an item.

### Returns

A new array containing the mapped values of elements where the callback returned a value.

## Examples

### Synchronous Selection

```ts
import { filterMap } from '@vielzeug/toolkit';

const numbers = [10, 20, 30, 40];

// Double only the numbers greater than 20
const result = filterMap(numbers, (x) => (x > 20 ? x * 2 : undefined));
// [60, 80]
```

### Asynchronous Selection

::: warning
`filterMap` does not support async callbacks. Use `parallel` or `Promise.all` for async mapping:

```ts
import { parallel } from '@vielzeug/toolkit';

const ids = [1, 2, 3];
const details = await parallel(ids, async (id) => fetchUser(id), { limit: 3 });
```

:::

### Default Filtering

```ts
import { filterMap } from '@vielzeug/toolkit';

const data = [1, null, 2, undefined, 3];

// Return undefined to skip nullish values
const doubled = filterMap(data, (x) => (x == null ? undefined : x * 2));
// [2, 4, 6]
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- The callback controls both mapping and filtering.
- `undefined` callback results are omitted from the output.

## See Also

- [toggle](./toggle.md): Add or remove an item from an array.
- [groupBy](./group.md): Collect related values into keyed groups.

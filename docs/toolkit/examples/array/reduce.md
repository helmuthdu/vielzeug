<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-248_B-success" alt="Size">
</div>

# reduce

The `reduce` utility reduces an array to a single value by executing a reducer function on each element, passing in the return value from the calculation on the preceding element.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/array/reduce.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Type-safe**: Correctly handles types for both elements and the accumulator.
- **Async Support**: If the callback returns a Promise, `reduce` will return a Promise that resolves to the final value once all elements are processed **sequentially**.

## API

```ts
function reduce<T, R>(
  array: T[],
  callback: (acc: R, item: T, index: number, array: T[]) => R | Promise<R>,
  initialValue: R,
): R | Promise<R>;
```

### Parameters

- `array`: The array to reduce.
- `callback`: The reducer function called for every element. It receives:
  - `acc`: The accumulated value.
  - `item`: The current element.
  - `index`: The index of the current element.
  - `array`: The original array.
- `initialValue`: The value to use as the first argument to the first call of the callback.

### Returns

- The accumulated result.
- A `Promise<R>` if the callback is asynchronous.

## Examples

### Basic Aggregation

```ts
import { reduce } from '@vielzeug/toolkit';

const numbers = [1, 2, 3, 4];
const sum = reduce(numbers, (acc, x) => acc + x, 0); // 10
```

### Building Objects

```ts
import { reduce } from '@vielzeug/toolkit';

const pairs: [string, number][] = [
  ['a', 1],
  ['b', 2],
  ['c', 3],
];
const obj = reduce(
  pairs,
  (acc, [key, val]) => {
    acc[key] = val;
    return acc;
  },
  {} as Record<string, any>,
);
// { a: 1, b: 2, c: 3 }
```

### Asynchronous Reduction

```ts
import { reduce, delay } from '@vielzeug/toolkit';

const tasks = [1, 2, 3];
const result = await reduce(
  tasks,
  async (acc, task) => {
    await delay(100); // Process task sequentially
    return acc + task;
  },
  0,
); // 6
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- **Sequential Execution**: Unlike `map` and `filter`, asynchronous `reduce` processes elements one after another, as the next call depends on the previous result.

## See Also

- [map](./map.md): Transform each element in an array.
- [filter](./filter.md): Subset an array.
- [aggregate](./aggregate.md): For more complex aggregation patterns.

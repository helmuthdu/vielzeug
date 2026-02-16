<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-148_B-success" alt="Size">
</div>

# draw

The `draw` utility picks a single random element from an array. It is perfect for sampling data, picking winners in a game, or selecting random items for display.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/random/draw.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Fair Selection**: Uses a uniform distribution to ensure every element has an equal chance of being picked.
- **Immutable**: Does not modify the original array.
- **Type-safe**: Properly infers the return type based on the array elements.

## API

```ts
function draw<T>(array: T[]): T | undefined;
```

### Parameters

- `array`: The array to draw from.

### Returns

- A random element from the array.
- Returns `undefined` if the array is empty.

## Examples

### Basic Usage

```ts
import { draw } from '@vielzeug/toolkit';

const fruits = ['apple', 'banana', 'cherry', 'date'];
const randomFruit = draw(fruits);
// returns one of the fruits randomly
```

### Sampling Objects

```ts
import { draw } from '@vielzeug/toolkit';

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
];

const winner = draw(users);
// returns one user object
```

## Implementation Notes

- Internally leverages the `random` utility to generate an index between `0` and `array.length – 1`.
- Throws `TypeError` if the input is not an array.
- Performance is $O(1)$ as it only picks one index regardless of array size.

## See Also

- [random](./random.md): Generate a random number in a range.
- [shuffle](./shuffle.md): Randomly reorder an entire array.
- [uuid](./uuid.md): Generate a unique identifier.

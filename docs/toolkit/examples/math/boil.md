# boil

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-148_B-success" alt="Size">
</div>

The `boil` utility reduces an array to a single "best" value based on a custom comparison function. It is a specialized version of a "winner-takes-all" reduction, ideal for finding maximums, minimums, or other extreme values based on complex logic.

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Comparison-based**: Unlike `reduce`, it focuses on choosing between two elements at a time.
- **Type-safe**: Properly infers the return type from the array elements.

## API

```ts
interface BoilFunction {
  <T>(array: T[], compare: (a: T, b: T) => T): T
}
```

### Parameters

- `array`: The array to process.
- `compare`: A function that receives two elements and must return the one that should "win" (the one to keep).

### Returns

- The single value that remained after all comparisons.
- Throws an error if the array is empty.

## Examples

### Finding the Longest String

```ts
import { boil } from '@vielzeug/toolkit';

const fruits = ['apple', 'banana', 'cherry', 'date'];

const longest = boil(fruits, (a, b) => a.length > b.length ? a : b);
// 'banana'
```

### Complex Object Selection

```ts
import { boil } from '@vielzeug/toolkit';

const users = [
  { name: 'Alice', score: 100 },
  { name: 'Bob', score: 150 },
  { name: 'Charlie', score: 120 }
];

const highScorer = boil(users, (a, b) => a.score > b.score ? a : b);
// { name: 'Bob', score: 150 }
```

## Implementation Notes

- Performance is $O(n)$ where $n$ is the length of the array.
- It is more semantically expressive than `reduce` when you are simply selecting one existing item from the array.
- Throws `TypeError` if the input is not an array or if the array is empty.

## See Also

- [max](./max.md): Specialized boil for finding the maximum number.
- [min](./min.md): Specialized boil for finding the minimum number.
- [reduce](../array/reduce.md): The general-purpose reduction utility.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>

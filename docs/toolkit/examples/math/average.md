# average

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-112_B-success" alt="Size">
</div>

The `average` utility calculates the arithmetic mean of an array of numbers. It provides a simple, functional way to find the average value in a collection.

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Robust**: Handles empty arrays by returning `NaN`.
- **Type-safe**: Properly typed for numeric inputs and results.

## API

```ts
interface AverageFunction {
  (numbers: number[]): number
}
```

### Parameters

- `numbers`: An array of numeric values to be averaged.

### Returns

- The arithmetic mean of the provided numbers.
- Returns `NaN` if the input array is empty.

## Examples

### Basic Usage

```ts
import { average } from '@vielzeug/toolkit';

const data = [10, 20, 30, 40, 50];
const mean = average(data); // 30
```

### Handling Empty Data

```ts
import { average } from '@vielzeug/toolkit';

const result = average([]); // NaN
```

## Implementation Notes

- Internally leverages the `sum` utility to calculate the total before dividing by the array length.
- Does not automatically filter out `null` or `undefined` values; ensure your input array contains only numbers for accurate results.
- Throws `TypeError` if the input is not an array.

## See Also

- [sum](./sum.md): Calculate the total of an array of numbers.
- [median](./median.md): Find the middle value in a set of numbers.
- [round](./round.md): Round the average result to a specific precision.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>

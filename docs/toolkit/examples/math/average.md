<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-112_B-success" alt="Size">
</div>

# average

The `average` utility calculates the arithmetic mean of an array of numbers. It provides a simple, functional way to find the average value in a collection.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/math/average.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Robust**: Handles empty arrays by returning `NaN`.
- **Type-safe**: Properly typed for numeric inputs and results.

## API

```ts
function average<T>(array: T[], callback?: (item: T) => number): number | undefined;
```

### Parameters

- `array`: An array of values to be averaged.
- `callback`: Optional. A function to map each item to a number or Date before averaging.

### Returns

- The arithmetic mean of the provided numbers or dates.
- Returns `undefined` if the input array is empty.

## Examples

### Basic Usage

```ts
import { average } from '@vielzeug/toolkit';

const data = [10, 20, 30, 40, 50];
const mean = average(data); // 30
```

### With Callback Function

```ts
import { average } from '@vielzeug/toolkit';

const items = [{ value: 10 }, { value: 20 }, { value: 30 }];
average(items, (item) => item.value); // 20

const numbers = [1, 2, 3, 4, 5];
average(numbers, (num) => num * 2); // 6
```

### Averaging Dates

```ts
import { average } from '@vielzeug/toolkit';

const dates = [new Date('2024-01-01'), new Date('2024-01-03'), new Date('2024-01-05')];
average(dates); // Date object representing 2024-01-03
```

### Handling Empty Data

```ts
import { average } from '@vielzeug/toolkit';

const result = average([]); // undefined
```

## Implementation Notes

- Internally leverages the `sum` utility to calculate the total before dividing by the array length.
- Does not automatically filter out `null` or `undefined` values; ensure your input array contains only numbers for accurate results.
- Throws `TypeError` if the input is not an array.

## See Also

- [sum](./sum.md): Calculate the total of an array of numbers.
- [median](./median.md): Find the middle value in a set of numbers.
- [round](./round.md): Round the average result to a specific precision.

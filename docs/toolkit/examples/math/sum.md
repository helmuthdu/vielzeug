<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1511_B-success" alt="Size">
</div>

# sum

Calculates the sum of an array of numbers.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/math/sum.ts
:::

## API

```ts
function sum<T>(array: T[], callback?: (item: T) => number): number | undefined
```

### Parameters

- `array`: Array of numbers or objects
- `callback`: Optional function to extract numeric values from objects

### Returns

- Sum of all numbers, or `undefined` if array is empty

## Examples

### Basic Usage

```ts
import { sum } from '@vielzeug/toolkit';

sum([1, 2, 3, 4, 5]); // 15
sum([]); // undefined
sum([10, 20, 30]); // 60
```

### With Callback Function

```ts
import { sum } from '@vielzeug/toolkit';

const items = [{ price: 10 }, { price: 20 }, { price: 30 }];
sum(items, (item) => item.price); // 60

const orders = [
  { total: 100, tax: 10 },
  { total: 200, tax: 20 }
];
sum(orders, (order) => order.total + order.tax); // 330
```

## Implementation Notes

- Returns `undefined` for an empty array
- Throws `TypeError` if a non-numeric value is encountered
- Use callback function to sum specific properties of objects

## See Also

- [average](./average.md): Calculate the average of numbers
- [boil](./boil.md): Reduce array with custom comparator
- [reduce](../array/reduce.md): General array reduction

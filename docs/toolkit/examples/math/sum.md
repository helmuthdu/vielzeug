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
sum<T>(array: T[], callback?: (item: T) => number): number | undefined
```

- `array`: Array of values to sum.
- `callback`: Optional. A function to map each item to a number before summing.
- Returns: The sum of the numbers (undefined if the array is empty).

## Example

```ts
import { sum } from '@vielzeug/toolkit';

sum([1, 2, 3, 4, 5]); // 15
sum([]); // undefined

// With callback function
const items = [{ price: 10 }, { price: 20 }, { price: 30 }];
sum(items, (item) => item.price); // 60
```

## Notes

- Returns `undefined` for an empty array.
- Throws `TypeError` if a non-numeric value is encountered (does not ignore them).

## Related

- [average](./average.md)
- [boil](./boil.md)

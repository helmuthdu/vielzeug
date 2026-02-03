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
sum(numbers: number[]): number
```

- `numbers`: Array of numbers to sum.
- Returns: The sum of the numbers (0 if the array is empty).

## Example

```ts
import { sum } from '@vielzeug/toolkit';

sum([1, 2, 3, 4, 5]); // 15
sum([]); // 0
```

## Notes

- Returns 0 for an empty array.
- Ignores non-numeric values (if any).

## Related

- [average](./average.md)
- [boil](./boil.md)
<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1165_B-success" alt="Size">
</div>

# median

Returns the median value of an array of numbers.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/math/median.ts
:::

## API

```ts
median(numbers: number[]): number | undefined
```

- `numbers`: Array of numbers.
- Returns: The median value, or `undefined` if the array is empty.

## Example

```ts
import { median } from '@vielzeug/toolkit';

median([1, 2, 3, 4, 5]); // 3
median([1, 2, 3, 4]); // 2.5
median([]); // undefined
```

## Notes

- Returns `undefined` for an empty array.
- The array is not mutated.

## Related

- [average](./average.md)
- [sum](./sum.md)
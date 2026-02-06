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
function median<T>(arr: T[], callback?: (item: T) => number | Date): number | Date | undefined
```

## Example

```ts
import { median } from '@vielzeug/toolkit';

median([1, 2, 3, 4, 5]); // 3
median([1, 2, 3, 4]); // 2.5
median([]); // undefined

// With callback
const items = [{ score: 85 }, { score: 90 }, { score: 95 }];
median(items, (item) => item.score); // 90

// With Dates
const dates = [new Date('2024-01-01'), new Date('2024-01-05'), new Date('2024-01-10')];
median(dates); // Date object representing 2024-01-05
```

## Notes

- Returns `undefined` for an empty array.
- The array is not mutated.

## Related

- [average](./average.md)
- [sum](./sum.md)

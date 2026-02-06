<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1047_B-success" alt="Size">
</div>

# min

Returns the smallest number in an array.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/math/min.ts
:::

## API

```ts
function min(numbers: number[]): number | undefined
```

## Example

```ts
import { min } from '@vielzeug/toolkit';

min([1, 5, 3, 9, 2]); // 1
min([]); // undefined
```

## Notes

- Returns `undefined` for an empty array.
- Ignores non-numeric values (if any).

## Related

- [max](./max.md)
- [clamp](./clamp.md)

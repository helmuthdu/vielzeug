<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-820_B-success" alt="Size">
</div>

# round

Rounds a number to a specified precision.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/math/round.ts
:::

## API

```ts
function round(value: number, decimals?: number): number;
```

## Example

```ts
import { round } from '@vielzeug/toolkit';

round(3.14159); // 3
round(3.14159, 2); // 3.14
round(3.14159, 4); // 3.1416
```

## Notes

- Handles negative and large numbers.
- Defaults to rounding to the nearest integer.

## Related

- [clamp](./clamp.md)
- [sum](./sum.md)

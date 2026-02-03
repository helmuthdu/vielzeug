<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-96_B-success" alt="Size">
</div>

# rate

The `rate` utility calculates the percentage of a value relative to a total. It is a simple but essential tool for generating progress indicators, statistics, or normalized values.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/math/rate.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Safe Division**: Handles cases where the total is zero by returning `0` instead of `Infinity`.
- **Type-safe**: Properly typed for numeric inputs and results.

## API

```ts
interface RateFunction {
  (value: number, total: number): number;
}
```

### Parameters

- `value`: The part or current value.
- `total`: The whole or maximum value.

### Returns

- A number representing the rate (between `0` and `100` if `value <= total`).

## Examples

### Basic Progress

```ts
import { rate } from '@vielzeug/toolkit';

rate(50, 100); // 50
rate(1, 4); // 25
rate(3, 10); // 30
```

### Safety with Zero

```ts
import { rate } from '@vielzeug/toolkit';

// Prevents division by zero errors
rate(10, 0); // 0
```

## Implementation Notes

- Returns `(value / total) * 100`.
- Returns `0` if `total` is zero to prevent `NaN` or `Infinity` results.
- Does not automatically round the result; use the `round` utility if precision is needed.

## See Also

- [round](./round.md): Round the calculated rate to a specific precision.
- [clamp](./clamp.md): Ensure the rate stays within a `0-100` range if `value > total`.
- [average](./average.md): Calculate the mean of multiple rates.

## Related

- [average](./average.md)
- [sum](./sum.md)

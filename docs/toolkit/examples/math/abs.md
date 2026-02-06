<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-450_B-success" alt="Size">
</div>

# abs

Returns the absolute value of a number. Supports both regular numbers and bigint.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/math/abs.ts
:::

## Features

- **Type-Safe**: Separate overloads for number and bigint
- **Precision**: Works with bigint for financial calculations
- **Simple API**: Single parameter, straightforward behavior
- **Isomorphic**: Works in both Browser and Node.js

## API

```ts
function abs(value: number): number;
function abs(value: bigint): bigint;
```

### Parameters

- `value`: The number or bigint to get absolute value of

### Returns

- Absolute value of the input (same type as input)

## Examples

### Basic Number Absolute Value

```ts
import { abs } from '@vielzeug/toolkit';

abs(-5); // 5
abs(5); // 5
abs(-3.14); // 3.14
abs(0); // 0
```

### BigInt Absolute Value

```ts
import { abs } from '@vielzeug/toolkit';

abs(-100n); // 100n
abs(100n); // 100n
abs(-999999n); // 999999n
```

### Real-World Example: Distance Calculation

```ts
import { abs } from '@vielzeug/toolkit';

function calculateDistance(a: number, b: number): number {
  return abs(a - b);
}

calculateDistance(10, 5); // 5
calculateDistance(5, 10); // 5
```

### Financial Example: Absolute Difference

```ts
import { abs } from '@vielzeug/toolkit';

const expected = 100000n; // $1,000.00
const actual = 95000n;    // $950.00

const difference = abs(expected - actual);
// 5000n ($50.00)
```

### Handling Negative Balances

```ts
import { abs } from '@vielzeug/toolkit';

const balance = -15000n; // -$150.00 (debt)
const debtAmount = abs(balance);
// 15000n ($150.00)
```

### Temperature Difference

```ts
import { abs } from '@vielzeug/toolkit';

const temp1 = -5; // -5°C
const temp2 = 10; // 10°C

const tempDifference = abs(temp1 - temp2);
// 15 (15°C difference)
```

## Implementation Notes

- For numbers, uses `Math.abs()` internally
- For bigint, uses conditional negation: `value < 0n ? -value : value`
- Always returns the same type as the input (number → number, bigint → bigint)
- Handles zero correctly (returns 0 or 0n)
- Useful for distance calculations, differences, and magnitude comparisons
- Perfect for financial calculations when you need the magnitude regardless of sign

## See Also

- [subtract](./subtract.md): Subtract numbers
- [multiply](./multiply.md): Multiply numbers
- [isNegative](../typed/isNegative.md): Check if value is negative
- [isPositive](../typed/isPositive.md): Check if value is positive

<style>
.badges {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.badges img {
  height: 20px;
}
</style>

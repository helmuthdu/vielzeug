<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-730_B-success" alt="Size">
</div>

# divide

Divides a number by a divisor with precision handling for financial calculations. Supports both regular numbers and bigint for exact precision.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/math/divide.ts
:::

## Features

- **Type-Safe**: Separate overloads for number and bigint
- **Precision**: Works with bigint for financial calculations
- **Division by Zero Protection**: Throws error to prevent invalid operations
- **Error Handling**: Prevents mixing number and bigint types
- **Isomorphic**: Works in both Browser and Node.js

## API

```ts
function divide(a: number, b: number): number;
function divide(a: bigint, b: bigint): bigint;
```

### Parameters

- `a`: Number to divide (dividend)
- `b`: Divisor

### Returns

- Quotient of `a` divided by `b` (same type as input)

### Throws

- `Error`: If divisor is zero

## Examples

### Basic Number Division

```ts
import { divide } from '@vielzeug/toolkit';

divide(20, 5); // 4
divide(100, 10); // 10
divide(10, 3); // 3.333...
```

### BigInt Division (Integer Result)

```ts
import { divide } from '@vielzeug/toolkit';

divide(20n, 5n); // 4n
divide(10n, 3n); // 3n (truncates, no decimals)
divide(7n, 2n); // 3n (truncates)
```

### Real-World Example: Split Cost

```ts
import { divide } from '@vielzeug/toolkit';

// Split $100.00 between 4 people
const total = 10000n; // $100.00 in cents
const people = 4n;

const perPerson = divide(total, people);
// 2500n ($25.00 each)
```

### Calculate Unit Price

```ts
import { divide } from '@vielzeug/toolkit';

const totalCost = 15000n; // $150.00
const quantity = 12n;

const pricePerUnit = divide(totalCost, quantity);
// 1250n ($12.50 per unit)
```

### Division by Zero Protection

```ts
import { divide } from '@vielzeug/toolkit';

try {
  divide(100, 0);
} catch (error) {
  console.error(error); // Error: Division by zero
}
```

## Implementation Notes

- Both parameters must be the same type (number or bigint)
- Throws `TypeError` if you try to mix number and bigint
- Throws `Error` if divisor is zero (prevents Infinity/NaN)
- BigInt division always returns integer (truncates decimal part)
- For financial calculations needing decimals, work in minor units (cents) before dividing
- Regular number division returns floating-point results

## See Also

- [add](./add.md): Add numbers
- [subtract](./subtract.md): Subtract numbers
- [multiply](./multiply.md): Multiply numbers
- [distribute](./distribute.md): Distribute amount evenly (handles remainders)

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

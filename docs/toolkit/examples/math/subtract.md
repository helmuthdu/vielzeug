<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-700_B-success" alt="Size">
</div>

# subtract

Subtracts one number from another with precision handling for financial calculations. Supports both regular numbers and bigint for exact precision.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/math/subtract.ts
:::

## Features

- **Type-Safe**: Separate overloads for number and bigint
- **Precision**: Works with bigint for financial calculations
- **Error Handling**: Prevents mixing number and bigint types
- **Isomorphic**: Works in both Browser and Node.js

## API

```ts
function subtract(a: number, b: number): number;
function subtract(a: bigint, b: bigint): bigint;
```

### Parameters

- `a`: Number to subtract from (minuend)
- `b`: Number to subtract (subtrahend)

### Returns

- Difference of `a` minus `b` (same type as input)

## Examples

### Basic Number Subtraction

```ts
import { subtract } from '@vielzeug/toolkit';

subtract(20, 10); // 10
subtract(100, 30); // 70
subtract(0.3, 0.1); // 0.2 (precision-safe)
```

### Negative Results

```ts
import { subtract } from '@vielzeug/toolkit';

subtract(10, 20); // -10
subtract(5, 15); // -10
```

### BigInt for Financial Precision

```ts
import { subtract } from '@vielzeug/toolkit';

// Working with cents
const total = 100000n; // $1,000.00
const discount = 15000n; // $150.00

subtract(total, discount); // 85000n ($850.00)
```

### Real-World Example: Refund Calculation

```ts
import { subtract } from '@vielzeug/toolkit';

const orderTotal = 45999n; // $459.99
const refundAmount = 12500n; // $125.00

const remaining = subtract(orderTotal, refundAmount);
// 33499n ($334.99)
```

### Calculate Change

```ts
import { subtract } from '@vielzeug/toolkit';

const amountPaid = 10000n; // $100.00
const price = 8795n; // $87.95

const change = subtract(amountPaid, price);
// 1205n ($12.05)
```

## Implementation Notes

- Both parameters must be the same type (number or bigint)
- Throws `TypeError` if you try to mix number and bigint
- For financial calculations, use bigint to store amounts in minor units (cents)
- Handles negative results correctly
- Can result in negative numbers when subtracting larger value from smaller

## See Also

- [add](./add.md): Add numbers
- [multiply](./multiply.md): Multiply numbers
- [divide](./divide.md): Divide numbers

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

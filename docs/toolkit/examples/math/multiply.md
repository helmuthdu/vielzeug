<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-690_B-success" alt="Size">
</div>

# multiply

Multiplies a number by a scalar with precision handling for financial calculations. Supports both regular numbers and bigint for exact precision.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/math/multiply.ts
:::

## Features

- **Type-Safe**: Separate overloads for number and bigint
- **Precision**: Works with bigint for financial calculations
- **Error Handling**: Prevents mixing number and bigint types
- **Isomorphic**: Works in both Browser and Node.js

## API

```ts
function multiply(a: number, b: number): number;
function multiply(a: bigint, b: bigint): bigint;
```

### Parameters

- `a`: Number to multiply (multiplicand)
- `b`: Multiplier

### Returns

- Product of `a` times `b` (same type as input)

## Examples

### Basic Number Multiplication

```ts
import { multiply } from '@vielzeug/toolkit';

multiply(10, 5); // 50
multiply(7, 8); // 56
multiply(0.1, 3); // 0.3 (precision-safe)
```

### Negative Numbers

```ts
import { multiply } from '@vielzeug/toolkit';

multiply(-10, 5); // -50
multiply(10, -5); // -50
multiply(-10, -5); // 50
```

### BigInt for Financial Precision

```ts
import { multiply } from '@vielzeug/toolkit';

// Calculate tax (8%)
const price = 50000n; // $500.00
const taxRate = 8n;

const tax = multiply(price, taxRate) / 100n;
// 4000n ($40.00)
```

### Real-World Example: Bulk Pricing

```ts
import { multiply } from '@vielzeug/toolkit';

const itemPrice = 1299n; // $12.99 per item
const quantity = 5n;

const total = multiply(itemPrice, quantity);
// 6495n ($64.95)
```

### Calculate Discount

```ts
import { multiply } from '@vielzeug/toolkit';

const originalPrice = 15999n; // $159.99
const discountPercent = 20n; // 20% off

const discountAmount = multiply(originalPrice, discountPercent) / 100n;
// 3199n ($31.99)

const finalPrice = originalPrice – discountAmount;
// 12800n ($128.00)
```

## Implementation Notes

- Both parameters must be the same type (number or bigint)
- Throws `TypeError` if you try to mix number and bigint
- For financial calculations with percentages, multiply first then divide
- Multiplication by zero always returns zero
- Multiplication by 1 returns the original value
- Sign rules: negative × positive = negative, negative × negative = positive

## See Also

- [add](./add.md): Add numbers
- [subtract](./subtract.md): Subtract numbers
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

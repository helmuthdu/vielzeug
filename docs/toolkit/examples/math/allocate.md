<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-2150_B-success" alt="Size">
</div>

# allocate

Distributes an amount proportionally according to given ratios. Handles rounding to ensure the sum equals the original amount exactly. Critical for financial operations like splitting payments to avoid rounding errors.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/math/allocate.ts
:::

## Features

- **Proportional Distribution**: Split amounts according to custom ratios
- **No Rounding Errors**: Sum always equals original amount exactly
- **Precision**: Works with bigint for financial calculations
- **Type-Safe**: Separate overloads for number and bigint
- **Error Handling**: Validates ratios and prevents invalid operations
- **Isomorphic**: Works in both Browser and Node.js

## API

```ts
function allocate(amount: number, ratios: number[]): number[];
function allocate(amount: bigint, ratios: number[]): bigint[];
```

### Parameters

- `amount`: Total amount to allocate (number or bigint)
- `ratios`: Array of ratios for distribution (e.g., `[1, 2, 3]`)

### Returns

- Array of allocated amounts (sum equals original amount)

### Throws

- `Error`: If ratios array is empty
- `Error`: If ratios contain negative values
- `Error`: If total ratio is zero

## Examples

### Basic Proportional Allocation

```ts
import { allocate } from '@vielzeug/toolkit';

// Split $100 in ratio 1:2:3
allocate(100, [1, 2, 3]);
// [16, 33, 51] – sum is exactly 100
```

### Split by Percentage

```ts
import { allocate } from '@vielzeug/toolkit';

// Split revenue: 50% partner A, 30% partner B, 20% partner C
const revenue = 100000n; // $1,000.00
allocate(revenue, [50, 30, 20]);
// [50000n, 30000n, 20000n]
```

### Real-World Example: Payment Commission

```ts
import { allocate } from '@vielzeug/toolkit';

const saleAmount = 500000n; // $5,000.00

// Split: 70% to company, 20% to salesperson, 10% to referrer
const [company, salesperson, referrer] = allocate(saleAmount, [70, 20, 10]);
// company: 350000n ($3,500.00)
// salesperson: 100000n ($1,000.00)
// referrer: 50000n ($500.00)
```

### Investment Portfolio Distribution

```ts
import { allocate } from '@vielzeug/toolkit';

const totalInvestment = 1000000n; // $10,000.00

// Portfolio: 60% stocks, 30% bonds, 10% cash
const [stocks, bonds, cash] = allocate(totalInvestment, [60, 30, 10]);
// stocks: 600000n ($6,000.00)
// bonds: 300000n ($3,000.00)
// cash: 100000n ($1,000.00)
```

### Handling Remainders Correctly

```ts
import { allocate } from '@vielzeug/toolkit';

// Split $100 equally among 3 parties
allocate(100, [1, 1, 1]);
// [34, 33, 33] – sum is exactly 100 (no penny lost!)

// With bigint (cents)
allocate(10000n, [1, 1, 1]);
// [3334n, 3333n, 3333n] – sum is exactly 10000n
```

### Tax Distribution

```ts
import { allocate } from '@vielzeug/toolkit';

const totalTax = 150000n; // $1,500.00 total tax collected

// Federal: 60%, State: 30%, Local: 10%
const [federal, state, local] = allocate(totalTax, [60, 30, 10]);
// federal: 90000n ($900.00)
// state: 45000n ($450.00)
// local: 15000n ($150.00)
```

### Unequal Ratios

```ts
import { allocate } from '@vielzeug/toolkit';

// Split bonus: Senior gets 5 shares, Junior gets 3 shares
const bonus = 800000n; // $8,000.00
const [senior, junior] = allocate(bonus, [5, 3]);
// senior: 500000n ($5,000.00)
// junior: 300000n ($3,000.00)
```

## Implementation Notes

- **Remainder Handling**: The last allocation gets any remainder to ensure exact sum
- **Ratio Type**: Ratios can be any positive numbers (integers or decimals)
- **Zero Ratios**: Ratios of zero are allowed (will receive zero allocation)
- **Precision**: Uses bigint arithmetic for financial precision when needed
- **Order**: Results are in the same order as the ratio array
- **Rounding**: Uses floor rounding, with remainder going to last item
- **Use Case**: Perfect for splitting payments, commissions, taxes, or any proportional distribution

## See Also

- [distribute](./distribute.md): Distribute amount evenly among N parties
- [divide](./divide.md): Simple division
- [multiply](./multiply.md): Multiply numbers

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

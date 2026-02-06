<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1450_B-success" alt="Size">
</div>

# distribute

Distributes an amount evenly among N parties. Handles rounding to ensure the sum equals the original amount exactly. Useful for splitting bills, costs, or payments equally.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/math/distribute.ts
:::

## Features

- **Even Distribution**: Split amounts equally among N parties
- **No Rounding Errors**: Sum always equals original amount exactly
- **Remainder Handling**: Extra pennies distributed to first recipients
- **Precision**: Works with bigint for financial calculations
- **Type-Safe**: Separate overloads for number and bigint
- **Error Handling**: Validates parts parameter
- **Isomorphic**: Works in both Browser and Node.js

## API

```ts
function distribute(amount: number, parts: number): number[];
function distribute(amount: bigint, parts: number): bigint[];
```

### Parameters

- `amount`: Total amount to distribute (number or bigint)
- `parts`: Number of parts to divide into (must be >= 1)

### Returns

- Array of distributed amounts (sum equals original amount)

### Throws

- `Error`: If parts is less than 1

## Examples

### Basic Even Distribution

```ts
import { distribute } from '@vielzeug/toolkit';

// Split $100 among 4 people
distribute(100, 4);
// [25, 25, 25, 25]
```

### Handling Remainders

```ts
import { distribute } from '@vielzeug/toolkit';

// Split $100 among 3 people
distribute(100, 3);
// [34, 33, 33] - sum is exactly 100 (first person gets extra penny)

// With bigint (cents)
distribute(10000n, 3);
// [3334n, 3333n, 3333n] - sum is exactly 10000n
```

### Real-World Example: Split Restaurant Bill

```ts
import { distribute } from '@vielzeug/toolkit';

const billTotal = 8547n; // $85.47
const people = 4;

const perPerson = distribute(billTotal, people);
// [2137n, 2137n, 2137n, 2136n]
// = [$21.37, $21.37, $21.37, $21.36]
```

### Share Costs Equally

```ts
import { distribute } from '@vielzeug/toolkit';

const projectCost = 250000n; // $2,500.00
const departments = 5;

const costPerDept = distribute(projectCost, departments);
// [50000n, 50000n, 50000n, 50000n, 50000n]
// Each department pays $500.00
```

### Split Refund

```ts
import { distribute } from '@vielzeug/toolkit';

const refundAmount = 12999n; // $129.99
const customers = 3;

const refundPerCustomer = distribute(refundAmount, customers);
// [4333n, 4333n, 4333n]
// Each customer gets $43.33
```

### Group Purchase

```ts
import { distribute } from '@vielzeug/toolkit';

const bulkPrice = 59999n; // $599.99 total for bulk purchase
const buyers = 7;

const pricePerBuyer = distribute(bulkPrice, buyers);
// [8571n, 8571n, 8571n, 8571n, 8571n, 8571n, 8572n]
// Most pay $85.71, last pays $85.72 (extra penny)
```

### Single Recipient

```ts
import { distribute } from '@vielzeug/toolkit';

distribute(100, 1);
// [100] - entire amount goes to single recipient
```

### Small Amounts

```ts
import { distribute } from '@vielzeug/toolkit';

// $0.10 among 3 people
distribute(10n, 3);
// [4n, 3n, 3n] = [$0.04, $0.03, $0.03]

// $0.05 among 3 people
distribute(5n, 3);
// [2n, 2n, 1n] = [$0.02, $0.02, $0.01]
```

## Implementation Notes

- **Remainder Distribution**: Extra amount from rounding goes to first recipients
- **Fair Distribution**: Everyone gets either floor(amount/parts) or floor(amount/parts) + 1
- **Order Matters**: First recipients may get one more unit than last recipients
- **Precision**: Uses integer division for exact calculations
- **Zero Amount**: `distribute(0, n)` returns array of zeros
- **Use Case**: Perfect for splitting bills, refunds, costs, or any equal distribution
- **BigInt Advantage**: No floating-point errors when working with financial amounts

## See Also

- [allocate](./allocate.md): Distribute amount proportionally by ratios
- [divide](./divide.md): Simple division
- [sum](./sum.md): Sum an array of numbers

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

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-680_B-success" alt="Size">
</div>

# add

Adds two numbers with precision handling for financial calculations. Supports both regular numbers and bigint for exact precision.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/math/add.ts
:::

## Features

- **Type-Safe**: Separate overloads for number and bigint
- **Precision**: Works with bigint for financial calculations
- **Error Handling**: Prevents mixing number and bigint types
- **Isomorphic**: Works in both Browser and Node.js

## API

```ts
function add(a: number, b: number): number;
function add(a: bigint, b: bigint): bigint;
```

### Parameters

- `a`: First number or bigint to add
- `b`: Second number or bigint to add

### Returns

- Sum of `a` and `b` (same type as input)

## Examples

### Basic Number Addition

```ts
import { add } from '@vielzeug/toolkit';

add(10, 20); // 30
add(5, 3); // 8
add(0.1, 0.2); // 0.3 (precision-safe)
```

### Negative Numbers

```ts
import { add } from '@vielzeug/toolkit';

add(-10, -20); // -30
add(-5, 10); // 5
add(10, -5); // 5
```

### BigInt for Financial Precision

```ts
import { add } from '@vielzeug/toolkit';

// Working with cents (amounts in minor units)
const price1 = 10050n; // $100.50
const price2 = 5025n; // $50.25

add(price1, price2); // 15075n ($150.75)
```

### Real-World Example: Shopping Cart

```ts
import { add } from '@vielzeug/toolkit';

// Prices in cents to avoid floating point issues
const items = [
  { name: 'Laptop', price: 99999n }, // $999.99
  { name: 'Mouse', price: 2499n }, // $24.99
  { name: 'Keyboard', price: 7999n }, // $79.99
];

const total = items.reduce((sum, item) => add(sum, item.price), 0n);
// 110497n ($1,104.97)
```

## Implementation Notes

- Both parameters must be the same type (number or bigint)
- Throws `TypeError` if you try to mix number and bigint
- For financial calculations, use bigint to store amounts in minor units (cents)
- Regular number addition works for most use cases
- BigInt addition ensures no floating-point precision errors

## See Also

- [subtract](./subtract.md): Subtract numbers
- [multiply](./multiply.md): Multiply numbers
- [divide](./divide.md): Divide numbers
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

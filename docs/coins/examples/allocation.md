---
title: 'Coins Examples — Allocation'
description: 'Distributing money across shares without losing a single minor unit.'
---

## Allocation

### Problem

You need to split a monetary total across multiple parties (three colleagues splitting a bill, distributing a discount across line items, apportioning revenue across cost centres) without ever losing or gaining a minor unit through rounding.

### Solution

Use `allocate()` with weighted ratios, or `splitEvenly()` for equal shares. Both use the **Largest Remainder Method** — every output sums exactly to the input amount.

```ts
import { allocate, format, money, splitEvenly } from '@vielzeug/coins';

// Three equal shares — $10.00 can't split into three exact thirds
const [a, b, c] = splitEvenly(money('10.00', 'USD'), 3);
format(a); // '$3.34'
format(b); // '$3.33'
format(c); // '$3.33'

// Verify: no penny lost
a.amount + b.amount + c.amount === money('10.00', 'USD').amount; // true
```

#### Weighted ratios

```ts
import { allocate, format, money } from '@vielzeug/coins';

const revenue = money('1000.00', 'USD');

// Distribute 30% / 70%
const [small, large] = allocate(revenue, ['0.3', '0.7']);
format(small); // '$300.00'
format(large); // '$700.00'

// Integer weights are proportional — they don't need to sum to any particular value
const [first, second, third] = allocate(revenue, [1, 2, 7]);
format(first); // '$100.00'
format(second); // '$200.00'
format(third); // '$700.00'
```

#### Cart discount distribution

```ts
import { allocate, format, money } from '@vielzeug/coins';
import type { Money } from '@vielzeug/coins';

const items: Money[] = [money('29.99', 'USD'), money('9.99', 'USD'), money('4.99', 'USD')];

const discount = money('5.00', 'USD');

// Distribute $5.00 discount proportionally across items by their price
const discounts = allocate(
  discount,
  items.map((item) => item.amount.toString()),
);

items.forEach((item, i) => {
  const afterDiscount = { amount: item.amount - discounts[i]!.amount, currency: 'USD' };
  console.log(`${format(item)} → ${format(afterDiscount)}`);
});
// $29.99 → $26.53
// $9.99  → $8.89
// $4.99  → $4.58
// Sum of discounts: $5.00 — exact
```

#### Building a zero accumulator

```ts
import { add, format, money } from '@vielzeug/coins';

// Use money(0n, currency) as a starting accumulator — no parsing overhead
const items = [money('12.50', 'USD'), money('3.99', 'USD'), money('0.01', 'USD')];
const total = items.reduce((acc, item) => add(acc, item), money(0n, 'USD'));

format(total); // '$16.50'
```

### Pitfalls

- `allocate()` throws `RangeError` if `ratios` is empty, all ratios are zero, or any ratio is negative. Validate inputs from external sources before passing.
- String ratios avoid IEEE-754 rounding on decimal weights — `'0.1'` is exact; `0.1` (number) is not. Prefer strings for fractional weights.
- The first share receives the largest remainder unit when the total doesn't divide evenly, but ties in fractional parts break left-to-right by array index, giving deterministic output.

### Related

- [API Reference — allocate()](../api.md#allocate-money-ratios)
- [API Reference — splitEvenly()](../api.md#splitevenly-money-parts)
- [Usage Guide — Allocation](../usage.md#allocation)

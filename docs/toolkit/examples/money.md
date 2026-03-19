---
title: 'Toolkit — Money Examples'
description: 'Money utility examples for Toolkit.'
---

# Money Utilities

Utilities for handling monetary amounts with precision and proper formatting.

## Overview

## Problem

Implement overview in a production-friendly way with `@vielzeug/toolkit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/toolkit` installed.

The money utilities provide essential functions for working with currency amounts, including formatting for display and currency conversion. These utilities use `bigint` for precise arithmetic to avoid floating-point errors common in financial calculations.

## Key Concepts

### Money Type

```ts
type Money = {
  readonly amount: bigint; // Amount in minor units (cents, pence, etc.)
  readonly currency: string; // ISO 4217 currency code (USD, EUR, GBP, etc.)
};
```

### Why BigInt?

Financial calculations require exact precision. Using `bigint` to store amounts in minor units (cents) eliminates floating-point errors:

```ts
// ❌ Bad – floating point errors
0.1 + 0.2; // 0.30000000000004

// ✅ Good – exact precision with bigint (cents)
10n + 20n; // 30n
```

## 🔗 All Money Utilities

<div class="grid-links">

- [currency](./money/currency.md)
- [exchange](./money/exchange.md)

</div>

## Usage Examples

### Format Money

```ts
import { currency } from '@vielzeug/toolkit';

const price = { amount: 123456n, currency: 'USD' };
currency(price); // '$1,234.56'
```

### Convert Currency

```ts
import { exchange } from '@vielzeug/toolkit';

const usd = { amount: 100000n, currency: 'USD' };
const rate = { from: 'USD', to: 'EUR', rate: 0.85 };

exchange(usd, rate); // { amount: 85000n, currency: 'EUR' }
```

## Related Utilities

For arithmetic operations on monetary amounts, see:

- [allocate](./math/allocate.md) – Split proportionally
- [distribute](./math/distribute.md) – Split evenly
- [percent](./math/percent.md) – Calculate percentage

<style>
.grid-links {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}

.grid-links a {
  display: block;
  padding: 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s;
}

.grid-links a:hover {
  border-color: var(--vp-c-brand);
  transform: translateY(-2px);
}
</style>

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Array Examples](./array.md)
- [Async Examples](./async.md)
- [Date Examples](./date.md)

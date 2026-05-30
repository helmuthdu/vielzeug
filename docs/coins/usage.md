---
title: Coins — Usage Guide
description: How to use @vielzeug/coins for money formatting and currency conversion.
---

# Usage Guide

## Installation

```sh
pnpm add @vielzeug/coins
```

## The `Money` Type

All monetary values use the `Money` type — an amount stored as `bigint` in minor units (cents, pence, etc.) plus an ISO 4217 currency code:

```ts
import type { Money } from '@vielzeug/coins';

const price: Money = { amount: 1999n, currency: 'USD' }; // $19.99
const vat: Money = { amount: 400n, currency: 'GBP' };    // £4.00
```

Using `bigint` avoids the classic floating-point issue:

```ts
// ❌ floating-point drift
0.1 + 0.2 === 0.3; // false

// ✅ exact with bigint minor units
100n + 200n === 300n; // true
```

## Formatting with `currency()`

`currency` renders a `Money` value using the browser/Node `Intl.NumberFormat` API.

```ts
import { currency } from '@vielzeug/coins';

const price = { amount: 2499n, currency: 'EUR' };

currency(price);                               // "€24.99" (system locale)
currency(price, { locale: 'de-DE' });          // "24,99 €"
currency(price, { locale: 'fr-FR' });          // "24,99 €"
currency(price, { currencyDisplay: 'code' });  // "EUR 24.99"
currency(price, { currencyDisplay: 'name' });  // "24.99 euros"
```

### Japanese Yen (zero decimal places)

```ts
const yen = { amount: 1500n, currency: 'JPY' };
currency(yen);                    // "¥1,500"
currency(yen, { locale: 'ja-JP' }); // "¥1,500"
```

## Converting with `exchange()`

`exchange` converts a `Money` value between currencies using a provided rate:

```ts
import { exchange } from '@vielzeug/coins';
import type { ExchangeRate } from '@vielzeug/coins';

const price = { amount: 10000n, currency: 'USD' }; // $100.00
const rate: ExchangeRate = { from: 'USD', to: 'EUR', rate: 0.92 };

const euros = exchange(price, rate);
// { amount: 9200n, currency: 'EUR' } → €92.00
```

The conversion multiplies in minor units and rounds to the nearest integer, maintaining precision.

## Practical Patterns

### Cart Total Formatting

```ts
import { currency } from '@vielzeug/coins';
import type { Money } from '@vielzeug/coins';

const items: Money[] = [
  { amount: 999n, currency: 'USD' },
  { amount: 1499n, currency: 'USD' },
  { amount: 250n, currency: 'USD' },
];

const total: Money = {
  amount: items.reduce((sum, item) => sum + item.amount, 0n),
  currency: 'USD',
};

currency(total); // "US$27.48"
```

### Multi-Currency Price Display

```ts
import { currency, exchange } from '@vielzeug/coins';

const price = { amount: 5000n, currency: 'USD' };
const rates = [
  { from: 'USD', to: 'EUR', rate: 0.92 },
  { from: 'USD', to: 'GBP', rate: 0.79 },
  { from: 'USD', to: 'JPY', rate: 149.5 },
];

for (const rate of rates) {
  const converted = exchange(price, rate);
  console.log(currency(converted));
}
// €46.00
// £39.50
// ¥7,475
```

## See Also

- [API Reference](./api.md)
- [Examples](./examples.md)

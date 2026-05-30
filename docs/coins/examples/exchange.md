---
title: Coins — Exchange Examples
description: Currency conversion patterns with @vielzeug/coins.
---

# Exchange Examples

## Basic Conversion

```ts
import { exchange } from '@vielzeug/coins';

const price = { amount: 10000n, currency: 'USD' }; // $100.00
const rate = { from: 'USD', to: 'EUR', rate: 0.92 };

exchange(price, rate); // { amount: 9200n, currency: 'EUR' }
```

## Multi-Currency Display

```ts
import { currency, exchange } from '@vielzeug/coins';

const usd = { amount: 5000n, currency: 'USD' }; // $50.00

const conversions = [
  { from: 'USD', to: 'EUR', rate: 0.92 },
  { from: 'USD', to: 'GBP', rate: 0.79 },
  { from: 'USD', to: 'JPY', rate: 149.5 },
];

for (const rate of conversions) {
  const result = exchange(usd, rate);
  console.log(`${result.currency}: ${currency(result)}`);
}
// EUR: €46.00
// GBP: £39.50
// JPY: ¥7,475
```

## Chained Conversions

```ts
import { exchange } from '@vielzeug/coins';

const usd = { amount: 10000n, currency: 'USD' };
const usdToEur = { from: 'USD', to: 'EUR', rate: 0.92 };
const eurToGbp = { from: 'EUR', to: 'GBP', rate: 0.86 };

const eur = exchange(usd, usdToEur); // { amount: 9200n, currency: 'EUR' }
const gbp = exchange(eur, eurToGbp); // { amount: 7912n, currency: 'GBP' }
```

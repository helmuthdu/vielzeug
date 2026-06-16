---
title: 'Coins Examples — Exchange Rate Conversion'
description: 'Exchange rate conversion example for @vielzeug/coins.'
---

## Exchange Rate Conversion

### Problem

You need to convert a `Money` value from one currency to another using a live or fixed exchange rate. Float multiplication of minor units introduces rounding errors; and when the result has a fractional minor unit you need explicit control over how it rounds (floor for sell rates, ceiling for buy rates, banker's rounding for bulk processing).

### Solution

Use `exchange()` with an `ExchangeRate` whose `rate` field is a **decimal string**. The rate is parsed into an exact numerator/denominator pair for lossless bigint multiplication. Pass an optional `RoundingMode` as the third argument.

```ts
import { exchange, format, money } from '@vielzeug/coins';
import type { ExchangeRate } from '@vielzeug/coins';

const price = money('100.00', 'USD');
const rate: ExchangeRate = { from: 'USD', rate: '0.92', to: 'EUR' };

const result = exchange(price, rate); // { amount: 9200n, currency: 'EUR' }
format(result); // '€92.00'
```

#### Explicit rounding modes

```ts
import { exchange, money } from '@vielzeug/coins';

const rate = { from: 'USD', rate: '0.926', to: 'EUR' };

const price = money('1.00', 'USD'); // 100 cents

// Each mode produces a different result for fractional minor units
exchange(price, rate); // 93n  half-away-from-zero (default)
exchange(price, rate, 'floor'); // 92n  toward −∞
exchange(price, rate, 'ceiling'); // 93n  toward +∞
exchange(price, rate, 'down'); // 92n  toward zero
exchange(price, rate, 'up'); // 93n  away from zero
exchange(price, rate, 'half-even'); // 93n  banker's rounding
```

#### Multi-currency display

```ts
import { exchange, format, money } from '@vielzeug/coins';
import type { ExchangeRate } from '@vielzeug/coins';

const price = money('50.00', 'USD');

const rates: ExchangeRate[] = [
  { from: 'USD', rate: '0.92', to: 'EUR' },
  { from: 'USD', rate: '0.79', to: 'GBP' },
  { from: 'USD', rate: '149.5', to: 'JPY' },
];

for (const rate of rates) {
  console.log(format(exchange(price, rate)));
}
// €46.00
// £39.50
// ¥7,475
```

#### Chained conversions

```ts
import { exchange, money } from '@vielzeug/coins';

const price = money('100.00', 'USD');
const usdToEur = { from: 'USD', rate: '0.92', to: 'EUR' };
const eurToGbp = { from: 'EUR', rate: '0.86', to: 'GBP' };

// Each conversion is independent — exchange() does not mutate
const inEur = exchange(price, usdToEur); // { amount: 9200n, currency: 'EUR' }
const inGbp = exchange(inEur, eurToGbp); // { amount: 7912n, currency: 'GBP' }
```

### Pitfalls

- `ExchangeRate.rate` must be a **string**, not a `number`. Passing `rate: 0.92` looks correct but introduces IEEE-754 drift before the bigint conversion; the type enforces `string`, but a cast would bypass it.
- `ExchangeRate.from` and `.to` are plain strings — no `toCurrencyCode()` ceremony needed. The currency is validated at `exchange()` call time.
- `exchange()` throws `CurrencyMismatchError` (extends `TypeError`) if `money.currency !== rate.from`. Validate that the source currency matches before calling, especially when reusing rate objects across different money values.
- `ExchangeRate.rate` must be a **non-empty** string. An empty string `''` throws `RangeError: Exchange rate must be a non-empty decimal string`. Guard against empty API responses before constructing the rate object.
- Each intermediate step in a chain introduces its own rounding. Chaining two `'floor'` conversions loses more precision than a single direct rate. Use a direct USD→GBP rate where precision matters.

### Related

- [Formatting](./formatting.md)
- [API Reference — exchange()](../api.md#exchange-money-rate-mode)
- [Usage Guide — Currency Exchange](../usage.md#currency-exchange)

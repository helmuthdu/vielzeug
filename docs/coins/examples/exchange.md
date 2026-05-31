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
import { exchange, format, money, toCurrencyCode } from '@vielzeug/coins';
import type { ExchangeRate } from '@vielzeug/coins';

const usd = toCurrencyCode('USD');
const eur = toCurrencyCode('EUR');

const price = money('100.00', 'USD');
const rate: ExchangeRate = { from: usd, rate: '0.92', to: eur };

const result = exchange(price, rate);  // { amount: 9200n, currency: 'EUR' }
format(result);                        // '€92.00'
```

#### Explicit rounding modes

```ts
import { exchange, money, toCurrencyCode } from '@vielzeug/coins';

const usd = toCurrencyCode('USD');
const eur = toCurrencyCode('EUR');
const rate = { from: usd, rate: '0.926', to: eur };

const price = money('1.00', 'USD');  // 100 cents

// Each mode produces a different result for fractional minor units
exchange(price, rate);                            // 93n  half-away-from-zero (default)
exchange(price, rate, 'floor');                   // 92n  toward −∞
exchange(price, rate, 'ceiling');                 // 93n  toward +∞
exchange(price, rate, 'down');                    // 92n  toward zero
exchange(price, rate, 'up');                      // 93n  away from zero
exchange(price, rate, 'half-even');               // 93n  banker's rounding
```

#### Multi-currency display

```ts
import { exchange, format, money, toCurrencyCode } from '@vielzeug/coins';
import type { ExchangeRate } from '@vielzeug/coins';

const usd   = toCurrencyCode('USD');
const price = money('50.00', 'USD');

const rates: ExchangeRate[] = [
  { from: usd, rate: '0.92',  to: toCurrencyCode('EUR') },
  { from: usd, rate: '0.79',  to: toCurrencyCode('GBP') },
  { from: usd, rate: '149.5', to: toCurrencyCode('JPY') },
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
import { exchange, money, toCurrencyCode } from '@vielzeug/coins';

const usd = toCurrencyCode('USD');
const eur = toCurrencyCode('EUR');
const gbp = toCurrencyCode('GBP');

const price    = money('100.00', 'USD');
const usdToEur = { from: usd, rate: '0.92', to: eur };
const eurToGbp = { from: eur, rate: '0.86', to: gbp };

// Each conversion is independent — exchange() does not mutate
const inEur = exchange(price, usdToEur);  // { amount: 9200n, currency: 'EUR' }
const inGbp = exchange(inEur, eurToGbp);  // { amount: 7912n, currency: 'GBP' }
```

### Pitfalls

- `ExchangeRate.rate` must be a **string**, not a `number`. Passing `rate: 0.92` looks right but introduces IEEE-754 drift before the bigint conversion; the type system enforces `string`, but a cast would bypass it.
- `ExchangeRate.from` and `to` require `CurrencyCode` values (obtained via `toCurrencyCode()`), not plain strings. If you pass an unvalidated string TypeScript will reject it at compile time.
- `exchange()` throws `TypeError` if `money.currency !== rate.from`. Validate that the source currency matches before calling, especially when reusing rate objects across different money values.
- Each intermediate step in a chain introduces its own rounding. Chaining two `'floor'` conversions loses more precision than a single direct rate. Use a direct USD→GBP rate where precision matters.

### Related

- [Formatting](./formatting.md)
- [API Reference — exchange()](../api.md#exchange-money-rate-mode)
- [Usage Guide — Currency Exchange](../usage.md#currency-exchange)


[[toc]]

# Exchange Examples

:::tip Rate must be a string
`ExchangeRate.rate` is a **decimal string** (e.g. `'0.92'`), not a number. Using a number would introduce IEEE-754 errors into the bigint arithmetic.
:::

## Basic Conversion

```ts
import { exchange, format, money, toCurrencyCode } from '@vielzeug/coins';
import type { ExchangeRate } from '@vielzeug/coins';

const usd = toCurrencyCode('USD');
const eur = toCurrencyCode('EUR');

const price = money('100.00', 'USD');
const rate: ExchangeRate = { from: usd, rate: '0.92', to: eur };

const euros = exchange(price, rate);
// { amount: 9200n, currency: 'EUR' }

format(euros);  // '€92.00'
```

## Explicit Rounding Modes

By default `exchange()` uses `'half-away-from-zero'`. Pass a second argument to choose a different mode:

```ts
import { exchange, money, toCurrencyCode } from '@vielzeug/coins';

const usd = toCurrencyCode('USD');
const eur = toCurrencyCode('EUR');
const rate = { from: usd, rate: '0.926', to: eur };

const price = money('1.00', 'USD');  // amount = 100n cents

exchange(price, rate, 'half-away-from-zero');  // 93n  ($0.93)
exchange(price, rate, 'floor');               // 92n  ($0.92)
exchange(price, rate, 'ceiling');             // 93n  ($0.93)
exchange(price, rate, 'down');                // 92n  ($0.92)
exchange(price, rate, 'up');                  // 93n  ($0.93)
exchange(price, rate, 'half-even');           // 93n  ($0.93)
```

## Multi-Currency Price Display

```ts
import { exchange, format, money, toCurrencyCode } from '@vielzeug/coins';
import type { ExchangeRate } from '@vielzeug/coins';

const usd  = toCurrencyCode('USD');
const price = money('50.00', 'USD');

const rates: ExchangeRate[] = [
  { from: usd, rate: '0.92',  to: toCurrencyCode('EUR') },
  { from: usd, rate: '0.79',  to: toCurrencyCode('GBP') },
  { from: usd, rate: '149.5', to: toCurrencyCode('JPY') },
];

for (const rate of rates) {
  console.log(format(exchange(price, rate)));
}
// €46.00
// £39.50
// ¥7,475
```

## Chained Conversions

```ts
import { exchange, money, toCurrencyCode } from '@vielzeug/coins';

const usd = toCurrencyCode('USD');
const eur = toCurrencyCode('EUR');
const gbp = toCurrencyCode('GBP');

const price     = money('100.00', 'USD');
const usdToEur  = { from: usd, rate: '0.92', to: eur };
const eurToGbp  = { from: eur, rate: '0.86', to: gbp };

const inEur = exchange(price, usdToEur);  // { amount: 9200n, currency: 'EUR' }
const inGbp = exchange(inEur, eurToGbp);  // { amount: 7912n, currency: 'GBP' }
```

## High-Precision Rates

Because `rate` is parsed as a rational number (numerator/denominator), arbitrarily precise rates work without floating-point drift:

```ts
import { exchange, format, money, toCurrencyCode } from '@vielzeug/coins';

const usd = toCurrencyCode('USD');
const brl = toCurrencyCode('BRL');  // Brazilian Real

const rate = { from: usd, rate: '5.019875', to: brl };

format(exchange(money('1000.00', 'USD'), rate));  // 'R$5,019.88'
```

## Negative Amounts

Negative amounts are handled correctly across all rounding modes:

```ts
import { exchange, format, money, toCurrencyCode } from '@vielzeug/coins';

const usd = toCurrencyCode('USD');
const eur = toCurrencyCode('EUR');
const rate = { from: usd, rate: '0.92', to: eur };

const refund = money('-50.00', 'USD');  // { amount: -5000n, currency: 'USD' }

format(exchange(refund, rate));               // '-€46.00'
format(exchange(refund, rate, 'floor'));      // '-€46.00'
format(exchange(refund, rate, 'ceiling'));    // '-€46.00'
```

## Currency Mismatch Error

`exchange()` throws `TypeError` if `money.currency` does not match `rate.from`:

```ts
import { exchange, money, toCurrencyCode } from '@vielzeug/coins';

const usd = toCurrencyCode('USD');
const eur = toCurrencyCode('EUR');
const rate = { from: usd, rate: '0.92', to: eur };

exchange(money('100.00', 'EUR'), rate);
// TypeError: Currency mismatch: EUR and USD
```

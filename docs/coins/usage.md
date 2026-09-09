---
title: Coins — Usage Guide
description: Construct exact money, aggregate values, convert currencies, and format results with Coins.
---

[[toc]]

## Basic Usage

Construct decimal values with a currency definition. Coins stores minor units internally and never accepts implicit floating-point input.

```ts
import { USD, add, money, toDecimal } from '@vielzeug/coins';

const subtotal = add(money('12.50', USD), money('7.25', USD));

console.log(toDecimal(subtotal)); // '19.75'
```

Use bigint only when data is already in minor units:

```ts
import { USD, money } from '@vielzeug/coins';

const cents = money(1999n, USD, { unit: 'minor' });
```

## Define Currencies

Coins exports seven built-in definitions: `USD`, `EUR`, `GBP`, `JPY`, `KRW`, `BHD`, and `KWD`. Construct other ISO or business currencies explicitly. Custom definitions are local canonical values; share one instance because arithmetic compares currencies by reference.

```ts
import { EUR, USD, currency, money } from '@vielzeug/coins';

const rewards = currency({ code: 'PTS', minorUnit: 0 });

money('10.00', USD);
money('10.00', EUR);
money('500', rewards);
```

## Apply Exact Arithmetic

Pass plain decimal strings to scaling operations; exponent notation, signs such as `+1`, whitespace, and numeric inputs are rejected. `multiply()`, `divide()`, `exchange()`, `round()`, and visible formatting default to `halfAwayFromZero`; pass a named mode when accounting policy requires another rule.

```ts
import { USD, divide, money, multiply, round, toDecimal } from '@vielzeug/coins';

const subtotal = money('19.99', USD);
const taxed = multiply(subtotal, '1.08', { rounding: 'halfEven' });

// Extra currency precision must name its rounding policy.
const roundedInput = money('19.999', USD, { rounding: 'halfAwayFromZero' });
const split = divide(taxed, '3', { rounding: 'floor' });
const displayed = round(taxed, { fractionDigits: 0, rounding: 'halfAwayFromZero' });

console.log(toDecimal(split), toDecimal(displayed));
```

## Aggregate and Allocate

`sum()` infers currency from non-empty values. Pass a canonical `{ currency }` for possibly empty iterables. `allocate()` preserves every minor unit, distributes remainders by largest fractional share with stable index ties, and applies the same allocation symmetrically to negative values. Counts and dense weight arrays are limited to 100,000 shares.

```ts
import { USD, allocate, money, sum, toDecimal } from '@vielzeug/coins';

const total = sum([money('10.00', USD), money('5.00', USD)]);
const zero = sum([], { currency: USD });
const weighted = allocate(money('10.00', USD), ['1', '2', '1']);
const even = allocate(money(5n, USD, { unit: 'minor' }), 2);

console.log(toDecimal(total));
console.log(weighted.map(toDecimal));
console.log(even.map((value) => value.amount)); // [3n, 2n]
```

## Convert Currency

Create a typed rate from currency definitions and a strictly positive exact decimal string.

```ts
import { EUR, USD, exchange, exchangeRate, format, money } from '@vielzeug/coins';

const usdToEur = exchangeRate({ from: USD, to: EUR, value: '0.9234' });
const euros = exchange(money('100.00', USD), usdToEur, { rounding: 'halfEven' });

console.log(format(euros, { locale: 'de-DE' }));
```

## Format Money

Format only at presentation boundaries. Coins keeps bigint arithmetic exact and uses `Intl.NumberFormat` only to obtain locale and currency layout.

```ts
import { EUR, format, formatParts, money } from '@vielzeug/coins';

const value = money('1234.56', EUR);
console.log(format(value, { locale: 'de-DE', style: 'code' }));
console.log(formatParts(value, { maximumFractionDigits: 1, rounding: 'halfEven' }));
```

Either fraction bound may be supplied independently; the omitted bound adjusts to remain compatible. Explicit values must satisfy `0 ≤ minimumFractionDigits ≤ maximumFractionDigits ≤ 20`. Formatting passes the exact decimal string and rounding mode to `Intl`, including locale digits, currency-name pluralization, and rounded negative signs. It never mutates money.

## Serialize Money

Use `toJSON()` and `decodeMoney()` at storage, transport, worker, and realm boundaries. Decoding validates the envelope and returns a new canonical `Money` value.

```ts
import { USD, currency, decodeMoney, money, toJSON } from '@vielzeug/coins';

const encoded = toJSON(money('19.99', USD));
const restored = decodeMoney(encoded);

const TOK = currency({ code: 'TOK', minorUnit: 2 });
const customEncoded = toJSON(money('1.00', TOK));
const custom = decodeMoney(customEncoded, {
  currency: (code) => (code === 'TOK' ? TOK : currency(code)),
});
```

`MoneyJSON.amount` is a canonical integer string of at most 1,000 characters in minor units: no decimal point, exponent, leading plus, leading zero, whitespace, or negative zero. Built-in codes resolve automatically; custom codes require a resolver.

`decodeMoney()` also accepts exactly `{ amount: bigint, currency: Currency }` when the currency is canonical. Custom resolvers must return the same code encoded in JSON. Use `isMoney()` only to test values already created or decoded in the current realm.

## Handle Errors

Use `CoinsError.code` for stable recovery branches.

```ts
import { CoinsError, USD, money } from '@vielzeug/coins';

try {
  money('19.999', USD);
} catch (error) {
  if (error instanceof CoinsError && error.code === 'INVALID_MONEY') {
    console.log('Over-precise decimal requires a rounding mode.');
  }
}
```

## Best Practices

- Use decimal strings for exact external inputs.
- Use bigint only with `{ unit: 'minor' }`.
- Pass named rounding options for division, scaling, and exchange.
- Export each custom currency from one module and reuse that canonical instance.
- Use `sum(values)` for non-empty collections; `sum(values, { currency })` for possibly empty ones.
- Serialize with `toJSON()` and validate or re-canonicalize with `decodeMoney()`.
- Format only at presentation boundaries.

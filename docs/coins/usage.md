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

Use built-in currency definitions for supported ISO currencies. Define a currency explicitly when your domain has a distinct scale.

```ts
import { EUR, USD, defineCurrency, money } from '@vielzeug/coins';

const rewards = defineCurrency({ code: 'PTS', minorUnit: 0 });

money('10.00', USD);
money('10.00', EUR);
money('500', rewards);
```

## Apply Exact Arithmetic

Pass decimal strings to scaling operations. Use named rounding whenever an operation can produce fractional minor units.

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

`sum` infers currency from non-empty values. Pass `{ currency }` only for possibly empty collections. `allocate` preserves every minor unit.

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

Create a typed rate from currency definitions and an exact decimal string.

```ts
import { EUR, USD, exchange, exchangeRate, format, money } from '@vielzeug/coins';

const usdToEur = exchangeRate({ from: USD, to: EUR, value: '0.9234' });
const euros = exchange(money('100.00', USD), usdToEur, { rounding: 'halfEven' });

console.log(format(euros, { locale: 'de-DE' }));
```

## Serialize Money

Use JSON helpers at storage and transport boundaries. Parsing validates the shape, unit, and currency code.

```ts
import { USD, money, parseMoneyJSON, toJSON } from '@vielzeug/coins';

const encoded = toJSON(money('19.99', USD));
const restored = parseMoneyJSON(encoded);

// Custom currencies require an explicit resolver at restore time.
const custom = parseMoneyJSON(customEncoded, { currency: resolveAppCurrency });
```

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
- Keep currency definitions at application boundaries.
- Use `sum(values)` for non-empty collections; `sum(values, { currency })` for possibly empty ones.
- Serialize with `toJSON` and validate with `parseMoneyJSON`.
- Format only at presentation boundaries.

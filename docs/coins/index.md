---
title: Coins — Money utilities for TypeScript
description: Zero-dependency, bigint-based monetary arithmetic, formatting, and currency conversion for TypeScript.
package: coins
category: utilities
keywords: [money, currency, exchange rate, formatting, bigint, locale, arithmetic, allocation]
related: [arsenal, tempo]
exports:
  [
    money,
    add,
    subtract,
    multiply,
    divide,
    abs,
    negate,
    roundTo,
    allocate,
    splitEvenly,
    clamp,
    sum,
    min,
    max,
    compare,
    isEqual,
    greaterThan,
    greaterThanOrEqual,
    lessThan,
    lessThanOrEqual,
    isZero,
    isPositive,
    isNegative,
    isNonNegative,
    isNonPositive,
    format,
    formatParts,
    exchange,
    toDecimal,
    toNumber,
    toJSON,
    fromJSON,
    withAmount,
    isMoney,
    validateCurrencyCode,
    CurrencyMismatchError,
    InvalidCurrencyError,
  ]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="coins" />

## Why Coins?

Monetary arithmetic with `number` accumulates IEEE-754 rounding errors. These errors are invisible in tests but show up in production totals, allocation remainders, and exchange results.

```ts
// Before — float arithmetic
const price = 10.1 + 10.2; // 20.299999999999997, not 20.3
const [a, b, c] = [price / 3, price / 3, price / 3];
a + b + c; // 20.299999999999997 — penny lost

// After — bigint minor units
import { add, allocate, money, toDecimal } from '@vielzeug/coins';
const price = add(money('10.10', 'USD'), money('10.20', 'USD'));
const [a, b, c] = allocate(price, [1, 1, 1]);
a.amount + b.amount + c.amount === price.amount; // true — always
```

| Feature                      | Coins                                       | Dinero.js v2                                    | currency.js                                                           |
| ---------------------------- | ------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| Bundle size                  | <PackageInfo package="coins" type="size" /> | ~14 kB                                          | ~2.5 kB                                                               |
| Zero dependencies            | <sg-icon name="check" size="16"></sg-icon>  | <sg-icon name="check" size="16"></sg-icon>      | <sg-icon name="check" size="16"></sg-icon>                            |
| `bigint` minor units         | <sg-icon name="check" size="16"></sg-icon>  | <sg-icon name="x" size="16"></sg-icon> (number) | <sg-icon name="x" size="16"></sg-icon> (number)                       |
| TypeScript-native            | <sg-icon name="check" size="16"></sg-icon>  | <sg-icon name="check" size="16"></sg-icon>      | <sg-icon name="triangle-alert" size="16"></sg-icon> third-party types |
| Validated currency codes     | <sg-icon name="check" size="16"></sg-icon>  | <sg-icon name="x" size="16"></sg-icon>          | <sg-icon name="x" size="16"></sg-icon>                                |
| Locale-aware formatting      | <sg-icon name="check" size="16"></sg-icon>  | <sg-icon name="check" size="16"></sg-icon>      | <sg-icon name="triangle-alert" size="16"></sg-icon> manual            |
| Largest Remainder allocation | <sg-icon name="check" size="16"></sg-icon>  | <sg-icon name="check" size="16"></sg-icon>      | <sg-icon name="x" size="16"></sg-icon>                                |

<div class="decision-callout">

**Use Coins when** you need exact bigint arithmetic with validated currencies, typed allocation, and `Intl`-powered formatting in a single zero-dependency package.

**Consider Dinero.js when** your team already uses it and float precision is acceptable for your use case.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/coins
```

```sh [npm]
npm install @vielzeug/coins
```

```sh [yarn]
yarn add @vielzeug/coins
```

:::

## Quick Start

```ts
import { add, allocate, exchange, format, money, multiply } from '@vielzeug/coins';
import type { ExchangeRate, Money } from '@vielzeug/coins';

// Create money from decimal strings (lossless) or bigint minor units
const price: Money = money('19.99', 'USD'); // { amount: 1999n, currency: 'USD' }
const tax: Money = money('1.60', 'USD');
const total: Money = add(price, tax); // { amount: 3559n, currency: 'USD' }

// Arithmetic
multiply(total, '1.1'); // $39.15 (half-away-from-zero, default)
multiply(total, '1.1', 'floor'); // explicit rounding mode

// Lossless allocation — no minor unit is ever lost or gained
allocate(money('10.00', 'USD'), [1, 1, 1]); // [$3.34, $3.33, $3.33]

// Locale-aware formatting
format(total); // '$35.59'
format(total, { locale: 'de-DE' }); // '35,59 $'
format(total, { style: 'code' }); // 'USD 35.59'

// Currency exchange — ExchangeRate.from/to are plain strings; rate is a decimal string
const rate: ExchangeRate = { from: 'USD', rate: '0.92', to: 'EUR' };
exchange(total, rate); // { amount: 3274n, currency: 'EUR' }
```

## Features

<div class="features-grid">

- `money()` — create from decimal string, number, or bigint minor units; currency validated at creation time via `Intl`; dev warning when float has more decimals than currency supports
- Arithmetic — `add`, `subtract`, `multiply`, `divide`, `abs`, `negate`; all throw `CurrencyMismatchError` on currency mismatch
- `roundTo()` — round to fewer decimal places (e.g. whole dollars); configurable rounding mode
- Allocation — `allocate` (weighted) and `splitEvenly` (equal); Largest Remainder Method guarantees exact totals
- Aggregates — `sum`, `min`, `max`, `clamp`; `min`/`max` accept a non-empty array
- Comparison — `compare`, `isEqual` (returns `false` on currency mismatch), `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual`, `isZero`, `isPositive`, `isNegative`, `isNonNegative`, `isNonPositive`
- `format()` — `Intl.NumberFormat`-powered string output with symbol / code / name / narrowSymbol styles
- `formatParts()` — typed part array for custom UI rendering (superscript cents, coloured symbols, etc.)
- `exchange()` — currency conversion using string rates; `ExchangeRate.from`/`to` are plain strings; throws `CurrencyMismatchError` on mismatch
- Serialization — `toDecimal`, `toNumber`, `toJSON`, `fromJSON`; safe `bigint` round-trip through JSON
- `withAmount()` — clone a `Money` with a new bigint amount, preserving the currency
- `isMoney()` — type guard for narrowing unknown payloads; own-property check guards against prototype pollution
- `CurrencyMismatchError` / `InvalidCurrencyError` — typed error subclasses for structured `catch` blocks

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Arsenal](/arsenal/) — general-purpose utility functions; pairs with Coins for formatting pipelines that combine numbers, strings, and currency in one pass
- [Tempo](/tempo/) — date and time utilities; combine with Coins when displaying transaction histories or time-windowed financial summaries

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->

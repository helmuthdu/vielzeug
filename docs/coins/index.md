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
    zero,
    toCurrencyCode,
    add,
    subtract,
    multiply,
    divide,
    allocate,
    splitEvenly,
    clamp,
    sum,
    min,
    max,
    abs,
    negate,
    compare,
    isZero,
    isPositive,
    isNegative,
    isNonNegative,
    isNonPositive,
    percentage,
    format,
    formatParts,
    exchange,
    toDecimal,
    toNumber,
    toJSON,
    fromJSON,
  ]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="coins" />

<img src="/logo-coins.svg" alt="Coins logo" width="156" class="logo-highlight"/>

# Coins

<details>
<summary><sg-icon name="zap" size="16"></sg-icon> Quick Reference</summary>

**Package:** `@vielzeug/coins` &nbsp;·&nbsp; **Category:** Utilities

**Key exports:** `money`, `zero`, `toCurrencyCode`, `add`, `subtract`, `multiply`, `divide`, `allocate`, `clamp`, `format`, `formatParts`, `exchange`

**When to use:** Precise monetary arithmetic — creation, arithmetic, allocation, locale-aware formatting, and exchange rate conversion without floating-point drift.

**Related:** [Arsenal](/arsenal/) · [Tempo](/tempo/)

</details>

`@vielzeug/coins` is a zero-dependency package for working with money in TypeScript. Amounts are stored as `bigint` in minor units (cents, pence, fils, etc.), eliminating floating-point rounding errors entirely. The package covers the full monetary workflow: creating values, arithmetic, allocation, formatting, serialization, and currency conversion.

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
import { add, allocate, exchange, format, money, multiply, toCurrencyCode } from '@vielzeug/coins';
import type { CurrencyCode, ExchangeRate, Money } from '@vielzeug/coins';

// Validate currency codes upfront (cached after first use)
const usd: CurrencyCode = toCurrencyCode('USD');
const eur: CurrencyCode = toCurrencyCode('EUR');

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

// Currency exchange — rate must be a decimal string (not a number)
const rate: ExchangeRate = { from: usd, rate: '0.92', to: eur };
exchange(total, rate); // { amount: 3274n, currency: 'EUR' }
```

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

| Feature                      | Coins                                       | Dinero.js v2 | currency.js          |
| ---------------------------- | ------------------------------------------- | ------------ | -------------------- |
| Bundle size                  | <PackageInfo package="coins" type="size" /> | ~14 kB       | ~2.5 kB              |
| Zero dependencies            | <sg-icon name="circle-check" size="16"></sg-icon>                                          | <sg-icon name="circle-check" size="16"></sg-icon>           | <sg-icon name="circle-check" size="16"></sg-icon>                   |
| `bigint` minor units         | <sg-icon name="circle-check" size="16"></sg-icon>                                          | <sg-icon name="circle-x" size="16"></sg-icon> (number)  | <sg-icon name="circle-x" size="16"></sg-icon> (number)          |
| TypeScript-native            | <sg-icon name="circle-check" size="16"></sg-icon>                                          | <sg-icon name="circle-check" size="16"></sg-icon>           | <sg-icon name="triangle-alert" size="16"></sg-icon> third-party types |
| Validated currency codes     | <sg-icon name="circle-check" size="16"></sg-icon>                                          | <sg-icon name="circle-x" size="16"></sg-icon>           | <sg-icon name="circle-x" size="16"></sg-icon>                   |
| Locale-aware formatting      | <sg-icon name="circle-check" size="16"></sg-icon>                                          | <sg-icon name="circle-check" size="16"></sg-icon>           | <sg-icon name="triangle-alert" size="16"></sg-icon> manual            |
| Largest Remainder allocation | <sg-icon name="circle-check" size="16"></sg-icon>                                          | <sg-icon name="circle-check" size="16"></sg-icon>           | <sg-icon name="circle-x" size="16"></sg-icon>                   |

**Use Coins when** you need exact bigint arithmetic with validated currencies, typed allocation, and `Intl`-powered formatting in a single zero-dependency package.

**Consider Dinero.js when** your team already uses it and float precision is acceptable for your use case.

## Features

- `money()` — create from decimal string, number, or bigint minor units; currency code validated at creation time
- `toCurrencyCode()` — brand and cache ISO 4217 codes; result is type-safe in `ExchangeRate`
- Arithmetic — `add`, `subtract`, `multiply`, `divide`, `percentage`, `abs`, `negate`; all throw `TypeError` on currency mismatch
- Allocation — `allocate` (weighted) and `splitEvenly` (equal); Largest Remainder Method guarantees exact totals
- Aggregates — `sum`, `min`, `max`, `clamp`
- Comparison — `compare`, `isEqual`, `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual`, `isZero`, `isPositive`, `isNegative`, `isNonNegative`, `isNonPositive`
- `format()` — `Intl.NumberFormat`-powered string output with symbol / code / name / narrowSymbol styles
- `formatParts()` — typed part array for custom UI rendering (superscript cents, coloured symbols, etc.)
- `exchange()` — currency conversion using string rates; rounding mode configurable
- Serialization — `toDecimal`, `toNumber`, `toJSON`, `fromJSON`; safe `bigint` round-trip through JSON

## Compatibility

| Environment  | Support |
| ------------ | ------- |
| Browser      | <sg-icon name="circle-check" size="16"></sg-icon>      |
| Node.js      | <sg-icon name="circle-check" size="16"></sg-icon>      |
| SSR          | <sg-icon name="circle-check" size="16"></sg-icon>      |
| Deno         | <sg-icon name="circle-check" size="16"></sg-icon>      |
| React Native | <sg-icon name="circle-check" size="16"></sg-icon>      |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Arsenal](/arsenal/) — general-purpose utility functions
- [Tempo](/tempo/) — date and time utilities

<!-- markdownlint-enable MD025 MD033 MD060 -->

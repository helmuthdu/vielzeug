---
title: Coins — Money utilities for TypeScript
description: Zero-dependency, bigint-based money formatting and currency conversion for TypeScript.
package: coins
category: utilities
keywords: [money, currency, exchange rate, formatting, bigint, locale, internationalization]
related: [arsenal, tempo]
exports: [currency, exchange]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="coins" />

# Coins

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/coins` &nbsp;·&nbsp; **Category:** Utilities

**Key exports:** `currency`, `exchange`, `Money`, `ExchangeRate`

**When to use:** Formatting monetary values for display and converting between currencies without floating-point drift.

**Related:** [Arsenal](/arsenal/) · [Tempo](/tempo/)

</details>

`@vielzeug/coins` is a small, zero-dependency package for working with money in TypeScript. It stores amounts as `bigint` in minor units (e.g. cents), avoiding floating-point rounding errors entirely.

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
import { currency, exchange } from '@vielzeug/coins';
import type { Money, ExchangeRate } from '@vielzeug/coins';

const price: Money = { amount: 1999n, currency: 'USD' }; // $19.99

// Format for display
currency(price);                           // "US$19.99"
currency(price, { locale: 'de-DE' });      // "19,99 $"

// Convert to EUR
const rate: ExchangeRate = { from: 'USD', to: 'EUR', rate: 0.92 };
const euros = exchange(price, rate);       // { amount: 1839n, currency: 'EUR' }
```

## Key Concepts

### Minor Units

All amounts are stored as `bigint` in the currency's minor unit (e.g. cents for USD, pence for GBP). This eliminates floating-point drift for financial calculations.

```ts
// $19.99 → 1999n cents
const price: Money = { amount: 1999n, currency: 'USD' };
```

### Integer Arithmetic

`exchange` multiplies in minor units and rounds using integer arithmetic, keeping results exact.

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Arsenal](/arsenal/) — general utility functions
- [Tempo](/tempo/) — date/time utilities

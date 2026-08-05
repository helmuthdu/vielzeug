---
title: Coins — Exact Money for TypeScript
description: Exact bigint monetary arithmetic with explicit currency definitions, decimal strings, allocation, exchange, formatting, and JSON boundaries.
package: coins
category: finance
keywords: [money, currency, bigint, decimal, exchange, formatting]
exports: [money, currency, add, allocate, exchange, format]
related: [vault, courier, spell]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="coins" />

## Why Coins?

Coins keeps monetary values in bigint minor units, but makes units explicit at construction. Currency scale comes from deterministic definitions; `Intl` formats a known value without deciding its arithmetic representation.

```ts
// Before
const total = (19.99 + 7.25) * 1.08;

// After
import { USD, add, money, multiply } from '@vielzeug/coins';

const total = multiply(add(money('19.99', USD), money('7.25', USD)), '1.08');
```

| Feature | Coins | decimal.js | Dinero.js |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="coins" type="size" /> | External dependency | External dependency |
| Bigint minor units | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Explicit currency scale | <ore-icon name="check" size="16"></ore-icon> | App-defined | Partial |
| Exact allocation | <ore-icon name="check" size="16"></ore-icon> | Manual | <ore-icon name="check" size="16"></ore-icon> |
| Zero dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |

<div class="decision-callout">

**Use Coins when** application values represent real money and every rounding boundary must be visible.

**Consider native numbers when** values are estimates, analytics, or display-only approximations.

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
import { USD, add, format, money, multiply } from '@vielzeug/coins';

const subtotal = add(money('12.50', USD), money('7.25', USD));
const total = multiply(subtotal, '1.08', { rounding: 'halfEven' });

console.log(format(total));
```

## Features

<div class="features-grid">

- **`money`**: one constructor for decimal and explicit minor-unit values
- **`currency`**: deterministic built-in currency definitions
- **`add`**: exact same-currency arithmetic
- **`allocate`**: split every minor unit without loss
- **`exchange`**: typed source and target currency conversion
- **`format`**: locale presentation for bigint values
- **`parseMoneyJSON`**: validate persisted money values

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Vault](/vault/) — persist validated money JSON.
- [Courier](/courier/) — retrieve exchange-rate data.
- [Spell](/spell/) — validate external monetary payloads.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->

---
title: Coins — API Reference
description: Complete API reference for @vielzeug/coins.
---

[[toc]]

## Package Entry Point

| Import            | Purpose                  |
| ----------------- | ------------------------ |
| `@vielzeug/coins` | All public Coins exports |

## `currency(money, options?)`

Formats a `Money` value as a locale-aware string using the `Intl.NumberFormat` API.

```ts
function currency(money: Money, options?: CurrencyFormatOptions): string;
```

### Parameters

| Parameter | Type                   | Description                                |
| --------- | ---------------------- | ------------------------------------------ |
| `money`   | `Money`                | The money value to format                  |
| `options` | `CurrencyFormatOptions`| Optional locale and display overrides      |

### `CurrencyFormatOptions`

| Field              | Type     | Default        | Description                                          |
| ------------------ | -------- | -------------- | ---------------------------------------------------- |
| `locale`           | `string` | system locale  | BCP 47 locale string (e.g. `'en-US'`, `'de-DE'`)    |
| `currencyDisplay`  | `string` | `'symbol'`     | `'symbol'` · `'narrowSymbol'` · `'code'` · `'name'` |

### Examples

```ts
import { currency } from '@vielzeug/coins';

const price = { amount: 1999n, currency: 'USD' };

currency(price);                                          // "US$19.99"
currency(price, { locale: 'de-DE' });                     // "19,99 $"
currency(price, { currencyDisplay: 'code' });             // "USD 19.99"
currency(price, { currencyDisplay: 'name' });             // "19.99 US dollars"
currency({ amount: 50n, currency: 'JPY' });               // "¥50"
```

---

## `exchange(money, rate)`

Converts a `Money` value from one currency to another using integer arithmetic to avoid floating-point drift.

```ts
function exchange(money: Money, rate: ExchangeRate): Money;
```

### Parameters

| Parameter | Type           | Description                               |
| --------- | -------------- | ----------------------------------------- |
| `money`   | `Money`        | The source money value to convert         |
| `rate`    | `ExchangeRate` | The exchange rate descriptor              |

### Examples

```ts
import { exchange } from '@vielzeug/coins';

const price = { amount: 1000n, currency: 'USD' }; // $10.00
const rate = { from: 'USD', to: 'EUR', rate: 0.92 };

exchange(price, rate); // { amount: 920n, currency: 'EUR' }
```

> **Note:** The `rate` field is a `number` (e.g. `0.92`). Internally the conversion multiplies the bigint amount by the rate and rounds to the nearest integer.

---

## Types

### `Money`

```ts
type Money = {
  amount: bigint;   // Amount in minor units (e.g. cents)
  currency: string; // ISO 4217 currency code (e.g. 'USD', 'EUR')
};
```

### `ExchangeRate`

```ts
type ExchangeRate = {
  from: string; // Source ISO 4217 currency code
  to: string;   // Target ISO 4217 currency code
  rate: number; // Multiplier to convert from → to
};
```

### `CurrencyFormatOptions`

```ts
type CurrencyFormatOptions = {
  locale?: string;
  currencyDisplay?: 'code' | 'name' | 'narrowSymbol' | 'symbol';
};
```

## See Also

- [Usage Guide](./usage.md)
- [Examples](./examples.md)
- [Arsenal](/arsenal/) — general utility functions

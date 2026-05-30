---
title: Coins — Formatting Examples
description: Locale-aware currency display with @vielzeug/coins.
---

# Formatting Examples

## Basic Usage

```ts
import { currency } from '@vielzeug/coins';

const price = { amount: 1999n, currency: 'USD' };
currency(price); // "US$19.99"
```

## Locale Variants

```ts
const price = { amount: 2499n, currency: 'EUR' };

currency(price, { locale: 'en-US' }); // "€24.99"
currency(price, { locale: 'de-DE' }); // "24,99 €"
currency(price, { locale: 'fr-FR' }); // "24,99 €"
```

## Display Modes

```ts
const price = { amount: 1500n, currency: 'USD' };

currency(price, { currencyDisplay: 'symbol' });       // "US$15.00"
currency(price, { currencyDisplay: 'narrowSymbol' }); // "$15.00"
currency(price, { currencyDisplay: 'code' });         // "USD 15.00"
currency(price, { currencyDisplay: 'name' });         // "15.00 US dollars"
```

## Zero-Decimal Currencies

```ts
const yen = { amount: 1500n, currency: 'JPY' };
currency(yen);                     // "¥1,500"
currency(yen, { locale: 'ja-JP' }); // "¥1,500"
```

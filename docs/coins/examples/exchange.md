---
title: Coins Examples — Exchange
description: Convert exact money through explicit currency definitions and decimal rates.
---

## Exchange Currency

### Problem

Convert money without converting an exchange rate through floating-point numbers.

### Solution

```ts
import { EUR, USD, exchange, exchangeRate, format, money } from '@vielzeug/coins';

const usdToEur = exchangeRate({ from: USD, to: EUR, value: '0.9234' });
const euros = exchange(money('100.00', USD), usdToEur, { rounding: 'halfEven' });

console.log(format(euros, { locale: 'de-DE' }));
```

### Pitfalls

Rate source currency must be the same canonical instance as the source money currency. Rates are positive decimal strings. Name the rounding mode when conversion can produce fractional target minor units.

### Related

- [Usage Guide](../usage.md#convert-currency)

---
title: Coins Examples — Formatting
description: Format bigint money values with Intl locale presentation.
---

## Format Money

### Problem

Present exact money without converting bigint minor units to floating-point values.

### Solution

```ts
import { EUR, USD, format, formatParts, money } from '@vielzeug/coins';

const price = money('1234.56', USD);

console.log(format(price));
console.log(format(money('1234.56', EUR), { locale: 'de-DE' }));
console.log(formatParts(price));
```

### Pitfalls

Formatting controls display only. Currency definitions control stored scale.

### Related

- [Usage Guide](../usage.md#basic-usage)

---
title: Coins Examples — Serialization
description: Serialize exact money and restore canonical values at trust and realm boundaries.
---

## Serialize and Decode Money

### Problem

Persist or transport bigint-backed money without losing its currency scale or accepting malformed data on restore.

### Solution

Serialize minor units with `toJSON()` and restore canonical money with `decodeMoney()`.

```ts
import { USD, decodeMoney, money, toJSON } from '@vielzeug/coins';

const payload = toJSON(money('19.99', USD));
const restored = decodeMoney(payload);

console.log(payload); // { amount: '1999', currency: 'USD', unit: 'minor' }
console.log(restored.amount); // 1999n
```

Provide a resolver for application-defined currencies:

```ts
import { currency, decodeMoney, money, toJSON } from '@vielzeug/coins';

const TOK = currency({ code: 'TOK', minorUnit: 2 });
const payload = toJSON(money('1.00', TOK));
const restored = decodeMoney(payload, {
  currency: (code) => (code === 'TOK' ? TOK : currency(code)),
});
```

### Pitfalls

- `MoneyJSON.amount` contains at most 1,000 characters of canonical integer minor units, not a decimal major-unit string.
- Custom currencies are not globally registered; decoding requires the shared application definition with the same encoded code.
- Bigint-shaped input must contain only `amount` and `currency`; JSON must contain only `amount`, `currency`, and `unit`.
- Structured cloning and worker transfer remove canonical identity. Call `decodeMoney()` in the receiving realm.
- `isMoney()` is an identity guard, not a decoder for external data.

### Related

- [Usage Guide](../usage.md#serialize-money)
- [API Reference](../api.md#serialization)

---
title: 'Coins Examples — Formatting'
description: 'Formatting example for @vielzeug/coins.'
---

## Formatting

### Problem

You have a `Money` value in bigint minor units and need to display it as a locale-aware currency string — or render individual parts (symbol, integer, fraction, sign) with separate CSS styles. `Intl.NumberFormat` requires a float, which loses precision for large amounts; manual string building is locale-dependent.

### Solution

Use `format()` for a plain string and `formatParts()` when you need typed part segments. Both use bigint arithmetic throughout and delegate only the locale formatting template to `Intl.NumberFormat`.

```ts
import { format, formatParts, money } from '@vielzeug/coins';

// Basic — defaults to 'en-US' locale, 'symbol' style
const price = money('1234.56', 'USD');
format(price); // '$1,234.56'
```

#### With locale and style options

```ts
import { format, money } from '@vielzeug/coins';

const price = money('1234.56', 'USD');

format(price, { locale: 'de-DE' }); // '1.234,56 $'
format(price, { locale: 'fr-FR' }); // '1 234,56 $'
format(price, { style: 'code' }); // 'USD 1,234.56'
format(price, { style: 'name' }); // '1,234.56 US dollars'
```

#### Zero-decimal and three-decimal currencies

```ts
import { format, money } from '@vielzeug/coins';

// JPY has no minor unit — amount is whole yen
format(money('1234', 'JPY')); // '¥1,234'
format(money('1234', 'JPY'), { locale: 'ja-JP' }); // '¥1,234'

// KWD uses 3 decimal places
format(money('1.234', 'KWD')); // 'KWD 1.234'
```

#### Custom fraction digits

```ts
import { format, money } from '@vielzeug/coins';

const price = money('1234.56', 'USD');

format(price, { maximumFractionDigits: 0 }); // '$1,235'
format(price, { minimumFractionDigits: 3, maximumFractionDigits: 3 }); // '$1,234.560'
format(money('10.00', 'USD'), { minimumFractionDigits: 0 }); // '$10'
```

#### Structured parts for custom rendering

```ts
import { formatParts, money } from '@vielzeug/coins';

formatParts(money('1234.56', 'USD'));
// [
//   { type: 'currency', value: '$' },
//   { type: 'integer',  value: '1,234' },
//   { type: 'decimal',  value: '.' },
//   { type: 'fraction', value: '56' },
// ]

formatParts(money('-99.99', 'USD'));
// [
//   { type: 'minusSign', value: '-' },
//   { type: 'currency',  value: '$' },
//   { type: 'integer',   value: '99' },
//   { type: 'decimal',   value: '.' },
//   { type: 'fraction',  value: '99' },
// ]

// Joining all values always produces the same string as format()
formatParts(money('1234.56', 'USD'))
  .map((p) => p.value)
  .join('');
// '$1,234.56'
```

#### React: superscript cents

```tsx
import { formatParts, money } from '@vielzeug/coins';

function Price({ value, currency }: { value: bigint; currency: string }) {
  const parts = formatParts(money(value, currency));

  return (
    <span className="price">
      {parts.map((part, i) =>
        part.type === 'fraction' ? (
          <sup key={i} className="price__cents">
            {part.value}
          </sup>
        ) : (
          <span key={i} className={`price__${part.type}`}>
            {part.value}
          </span>
        ),
      )}
    </span>
  );
}
```

### Pitfalls

- `maximumFractionDigits` must be ≥ `minimumFractionDigits`. Setting `{ minimumFractionDigits: 3, maximumFractionDigits: 2 }` throws `RangeError`.
- For zero-decimal currencies (JPY, KRW), passing `minimumFractionDigits: 2` forces decimal display that does not match the currency convention. Let the currency default apply unless the design explicitly requires it.
- `formatParts` part types come from `Intl.NumberFormat.prototype.formatToParts`. Switching locales can change which `literal` separators appear and in what order. Always iterate by `type`, not by index.

### Related

- [Exchange Rate Conversion](./exchange.md)
- [API Reference — format()](../api.md#format-money-options)
- [API Reference — formatParts()](../api.md#formatparts-money-options)

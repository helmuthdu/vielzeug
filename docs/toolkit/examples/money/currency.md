<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-2400_B-success" alt="Size">
</div>

# currency

Formats a monetary amount as a currency string with proper locale and symbol. Handles decimal places automatically based on currency.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/money/currency.ts
:::

## Features

- **Locale-Aware**: Formats according to user's locale preferences
- **Currency Symbols**: Displays proper currency symbols ($, €, ¥, etc.)
- **Multiple Styles**: Symbol, code, or name display
- **Auto-Decimals**: Handles 0, 2, or 3 decimal currencies automatically
- **Type-Safe**: Uses Money type for precision
- **Isomorphic**: Works in both Browser and Node.js

## API

::: details Type Definitions
<<< @/../packages/toolkit/src/money/types.ts
:::

```ts
function currency(money: Money, options?: CurrencyFormatOptions): string;
```

### Parameters

- `money`: Money object `{ amount: bigint, currency: string }`
  - `amount`: Amount in minor units (cents) as bigint
  - `currency`: ISO 4217 currency code (e.g., 'USD', 'EUR', 'JPY')
- `options`: Optional formatting options
  - `locale`: BCP 47 language tag (default: 'en-US')
  - `style`: Display style – 'symbol', 'code', or 'name' (default: 'symbol')
  - `minimumFractionDigits`: Minimum decimal places
  - `maximumFractionDigits`: Maximum decimal places

### Returns

- Formatted currency string

## Examples

### Basic Formatting

```ts
import { currency } from '@vielzeug/toolkit';

const money = { amount: 123456n, currency: 'USD' };

currency(money);
// '$1,234.56' (US format with symbol)
```

### Different Locales

```ts
import { currency } from '@vielzeug/toolkit';

const money = { amount: 123456n, currency: 'EUR' };

// US English
currency(money, { locale: 'en-US' });
// '€1,234.56'

// German
currency(money, { locale: 'de-DE' });
// '1.234,56 €'

// French
currency(money, { locale: 'fr-FR' });
// '1 234,56 €'
```

### Display Styles

```ts
import { currency } from '@vielzeug/toolkit';

const money = { amount: 100000n, currency: 'USD' };

// Symbol (default)
currency(money, { style: 'symbol' });
// '$1,000.00'

// Currency code
currency(money, { style: 'code' });
// 'USD 1,000.00'

// Full name
currency(money, { style: 'name' });
// '1,000.00 US dollars'
```

### Zero-Decimal Currencies

```ts
import { currency } from '@vielzeug/toolkit';

// Japanese Yen (no decimals)
const yen = { amount: 1234n, currency: 'JPY' };
currency(yen);
// '¥1,234'

// Korean Won (no decimals)
const won = { amount: 5000n, currency: 'KRW' };
currency(won);
// '₩5,000'
```

### Three-Decimal Currencies

```ts
import { currency } from '@vielzeug/toolkit';

// Kuwaiti Dinar (3 decimals)
const kwd = { amount: 123456n, currency: 'KWD' };
currency(kwd);
// 'KD 123.456'

// Bahraini Dinar (3 decimals)
const bhd = { amount: 10000n, currency: 'BHD' };
currency(bhd);
// 'BD 10.000'
```

### Real-World Example: E-commerce Display

```ts
import { currency } from '@vielzeug/toolkit';

const products = [
  { name: 'Laptop', price: { amount: 99999n, currency: 'USD' } },
  { name: 'Mouse', price: { amount: 2499n, currency: 'USD' } },
  { name: 'Keyboard', price: { amount: 7999n, currency: 'USD' } },
];

products.forEach((product) => {
  console.log(`${product.name}: ${currency(product.price)}`);
});
// Laptop: $999.99
// Mouse: $24.99
// Keyboard: $79.99
```

### Multi-Currency Support

```ts
import { currency } from '@vielzeug/toolkit';

const prices = {
  usd: { amount: 100000n, currency: 'USD' },
  eur: { amount: 85000n, currency: 'EUR' },
  gbp: { amount: 73000n, currency: 'GBP' },
  jpy: { amount: 11000n, currency: 'JPY' },
};

Object.entries(prices).forEach(([code, money]) => {
  console.log(`${code.toUpperCase()}: ${currency(money)}`);
});
// USD: $1,000.00
// EUR: €850.00
// GBP: £730.00
// JPY: ¥11,000
```

### Negative Amounts

```ts
import { currency } from '@vielzeug/toolkit';

const refund = { amount: -15000n, currency: 'USD' };

currency(refund);
// '-$150.00' or '($150.00)' depending on locale
```

### Custom Fraction Digits

```ts
import { currency } from '@vielzeug/toolkit';

const money = { amount: 100000n, currency: 'USD' };

// Force specific decimal places
currency(money, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});
// '$1,000.00'
```

## Implementation Notes

- **Amount Storage**: Store amounts as bigint in minor units (cents) to avoid floating-point errors
- **Currency Codes**: Use ISO 4217 currency codes (3-letter codes like 'USD', 'EUR')
- **Decimal Detection**: Automatically determines decimal places based on currency
  - 0 decimals: JPY, KRW, VND, and others
  - 2 decimals: Most currencies (USD, EUR, GBP, etc.)
  - 3 decimals: BHD, KWD, OMR, JOD, and others
- **Intl.NumberFormat**: Uses native browser/Node.js API for formatting
- **Locale Format**: Follows BCP 47 standard (e.g., 'en-US', 'de-DE', 'fr-FR')
- **Symbol Position**: Varies by locale ($ before in US, € after in some European locales)

## See Also

- [exchange](../money/exchange.md): Convert between currencies
- [add](../math/add.md): Add monetary amounts
- [distribute](../math/distribute.md): Split amounts equally

<style>
.badges {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.badges img {
  height: 20px;
}
</style>

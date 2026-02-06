<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1200_B-success" alt="Size">
</div>

# exchange

Converts money from one currency to another using the provided exchange rate. Maintains precision by using bigint arithmetic.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/money/exchange.ts
:::

## Features

- **Precision-Safe**: Uses bigint arithmetic to avoid floating-point errors
- **Currency Validation**: Ensures source currency matches exchange rate
- **Type-Safe**: Uses Money and ExchangeRate types
- **Flexible Rates**: Accepts any exchange rate multiplier
- **Isomorphic**: Works in both Browser and Node.js

## API

::: details Type Definitions
<<< @/../packages/toolkit/src/money/types.ts
:::

```ts
function exchange(money: Money, rate: ExchangeRate): Money
```

### Parameters

- `money`: Money object to convert
  - `amount`: Amount in minor units (cents) as bigint
  - `currency`: ISO 4217 source currency code
- `rate`: Exchange rate information
  - `from`: Source currency code (must match money.currency)
  - `to`: Target currency code
  - `rate`: Exchange rate multiplier

### Returns

- New Money object in target currency

### Throws

- `Error`: If source currency doesn't match rate.from

## Examples

### Basic Currency Conversion

```ts
import { exchange } from '@vielzeug/toolkit';

const usd = { amount: 100000n, currency: 'USD' }; // $1,000.00
const rate = { from: 'USD', to: 'EUR', rate: 0.85 };

const eur = exchange(usd, rate);
// { amount: 85000n, currency: 'EUR' } // €850.00
```

### Reverse Conversion

```ts
import { exchange } from '@vielzeug/toolkit';

const eur = { amount: 85000n, currency: 'EUR' }; // €850.00
const rate = { from: 'EUR', to: 'USD', rate: 1.18 };

const usd = exchange(eur, rate);
// { amount: 100300n, currency: 'USD' } // ~$1,003.00
```

### Real-World Example: International Purchase

```ts
import { exchange, currency } from '@vielzeug/toolkit';

// Product price in USD
const productPrice = { amount: 49999n, currency: 'USD' }; // $499.99

// Current exchange rate USD -> EUR
const usdToEur = { from: 'USD', to: 'EUR', rate: 0.92 };

// Convert to EUR for European customer
const priceInEur = exchange(productPrice, usdToEur);
// { amount: 45999n, currency: 'EUR' }

console.log(`Price: ${currency(priceInEur, { locale: 'de-DE' })}`);
// Price: 459,99 €
```

### Multi-Currency Conversion

```ts
import { exchange } from '@vielzeug/toolkit';

const usd = { amount: 100000n, currency: 'USD' }; // $1,000.00

// Convert to multiple currencies
const rates = [
  { from: 'USD', to: 'EUR', rate: 0.85 },
  { from: 'USD', to: 'GBP', rate: 0.73 },
  { from: 'USD', to: 'JPY', rate: 110.0 },
];

const conversions = rates.map(rate => ({
  currency: rate.to,
  amount: exchange(usd, rate)
}));

// EUR: { amount: 85000n, currency: 'EUR' }
// GBP: { amount: 73000n, currency: 'GBP' }
// JPY: { amount: 11000000n, currency: 'JPY' }
```

### High Exchange Rate (to JPY)

```ts
import { exchange } from '@vielzeug/toolkit';

const usd = { amount: 10000n, currency: 'USD' }; // $100.00
const rate = { from: 'USD', to: 'JPY', rate: 110.5 };

const jpy = exchange(usd, rate);
// { amount: 1105000n, currency: 'JPY' } // ¥11,050
```

### Low Exchange Rate (from JPY)

```ts
import { exchange } from '@vielzeug/toolkit';

const jpy = { amount: 1105000n, currency: 'JPY' }; // ¥11,050
const rate = { from: 'JPY', to: 'USD', rate: 0.00905 };

const usd = exchange(jpy, rate);
// { amount: 10000n, currency: 'USD' } // ~$100.00
```

### Dynamic Exchange Rates

```ts
import { exchange } from '@vielzeug/toolkit';

// Fetch current exchange rate from API
async function convertCurrency(money: Money, targetCurrency: string) {
  // Simulated API call
  const apiRate = await fetchExchangeRate(money.currency, targetCurrency);
  
  const rate = {
    from: money.currency,
    to: targetCurrency,
    rate: apiRate
  };
  
  return exchange(money, rate);
}

// Usage
const usd = { amount: 250000n, currency: 'USD' };
const gbp = await convertCurrency(usd, 'GBP');
```

### Currency Validation Error

```ts
import { exchange } from '@vielzeug/toolkit';

const eur = { amount: 100000n, currency: 'EUR' };
const wrongRate = { from: 'USD', to: 'GBP', rate: 0.73 };

try {
  exchange(eur, wrongRate);
} catch (error) {
  console.error(error);
  // Error: Currency mismatch: expected USD, got EUR
}
```

### Chain Conversions

```ts
import { exchange } from '@vielzeug/toolkit';

// USD -> EUR -> GBP
const usd = { amount: 100000n, currency: 'USD' };

const usdToEur = { from: 'USD', to: 'EUR', rate: 0.85 };
const eur = exchange(usd, usdToEur);
// { amount: 85000n, currency: 'EUR' }

const eurToGbp = { from: 'EUR', to: 'GBP', rate: 0.86 };
const gbp = exchange(eur, eurToGbp);
// { amount: 73100n, currency: 'GBP' }
```

## Implementation Notes

- **Precision**: Uses bigint multiplication/division to maintain precision
- **Rate Multiplier**: Rate of 0.85 means 1 unit of source = 0.85 units of target
- **Minor Units**: Both source and target amounts are in minor units (cents)
- **Rounding**: Uses integer division (truncates), may lose fractional cents
- **Rate Source**: You must provide exchange rates (from API, database, etc.)
- **Currency Validation**: Always validates that source currency matches rate.from
- **Negative Amounts**: Handles negative amounts correctly
- **Precision Factor**: Internally uses 6 decimal places for rate precision

## See Also

- [currency](./currency.md): Format money for display
- [add](../math/add.md): Add monetary amounts
- [multiply](../math/multiply.md): Multiply amounts

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

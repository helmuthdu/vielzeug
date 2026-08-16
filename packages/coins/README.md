# @vielzeug/coins

Exact monetary arithmetic for TypeScript. Coins stores bigint minor units, uses explicit currency definitions, and accepts decimal strings at every exact-input boundary.

## Install

```sh
pnpm add @vielzeug/coins
```

## Start Here

```ts
import { USD, add, money, toDecimal } from '@vielzeug/coins';

const subtotal = add(money('12.50', USD), money('7.25', USD));

console.log(toDecimal(subtotal)); // '19.75'
```

`money()` has one common path and one explicit low-level path:

```ts
money('19.99', USD);                    // exact decimal major units
money('19.999', USD, { rounding: 'halfEven' });
money(1999n, USD, { unit: 'minor' });   // stored minor units
```

## Core API

```ts
import {
  EUR,
  USD,
  allocate,
  exchange,
  exchangeRate,
  format,
  money,
  multiply,
  sum,
  toDecimal,
} from '@vielzeug/coins';

const items = [money('12.50', USD), money('7.25', USD)];
const subtotal = sum(items);
const total = multiply(subtotal, '1.08', { rounding: 'halfEven' });
const shares = allocate(total, 3);

const usdToEur = exchangeRate({ from: USD, to: EUR, value: '0.9234' });
const eurTotal = exchange(total, usdToEur, { rounding: 'halfEven' });

console.log(format(eurTotal, { locale: 'de-DE' }));
console.log(shares.map(toDecimal));
```

## Currency Definitions

Built-in definitions: `USD`, `EUR`, `GBP`, `JPY`, `KRW`, `BHD`, `KWD`.

Define a business currency explicitly when required:

```ts
import { defineCurrency, money } from '@vielzeug/coins';

const POINTS = defineCurrency({ code: 'PTS', minorUnit: 0 });
const balance = money('250', POINTS);
```

## Errors

All failures extend `CoinsError` and expose `code`.

```ts
import { CoinsError, money, USD } from '@vielzeug/coins';

try {
  money('19.999', USD);
} catch (error) {
  if (error instanceof CoinsError && error.code === 'INVALID_MONEY') {
    // Over-precise decimal requires a rounding mode.
  }
}
```

## License

MIT © Helmuth Saatkamp

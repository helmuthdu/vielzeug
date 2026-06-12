---
title: Coins — Usage Guide
description: How to use @vielzeug/coins for monetary arithmetic, formatting, and currency conversion.
---

[[toc]]

## Basic Usage

Use `money()` to construct a `Money` value from a human-readable decimal, number, or raw bigint minor units. Use `zero()` when you need an idiomatic zero starting point. The currency code is validated against `Intl.NumberFormat` — unrecognised codes throw `RangeError`.

```ts
import { money, zero } from '@vielzeug/coins';

// From decimal string (preferred — lossless)
money('1234.56', 'USD'); // { amount: 123456n, currency: 'USD' }
money('-10.50', 'USD'); // { amount: -1050n,  currency: 'USD' }
money('1234', 'JPY'); // { amount: 1234n,   currency: 'JPY' }  (zero-decimal)
money('1.234', 'KWD'); // { amount: 1234n,   currency: 'KWD' }  (three-decimal)

// From number (converted via String() — IEEE-754 applies; prefer strings)
money(1234.56, 'USD'); // { amount: 123456n, currency: 'USD' }

// From bigint — raw minor units, passed through as-is
money(123456n, 'USD'); // { amount: 123456n, currency: 'USD' }

// Zero amount — idiomatic starting value
zero('USD'); // { amount: 0n, currency: 'USD' }
zero('JPY'); // { amount: 0n, currency: 'JPY' }

// Invalid currency — throws RangeError
money('1.00', 'NOTREAL'); // RangeError: Invalid ISO 4217 currency code: "NOTREAL"
```

`Money` is a plain readonly object — no class, no methods:

```ts
type Money = {
  readonly amount: bigint; // minor units
  readonly currency: CurrencyCode; // validated, branded string
};
```

## Validated Currency Codes

`CurrencyCode` is a branded string. Obtain one via `toCurrencyCode()` when you need to build an `ExchangeRate` or process a currency string from user input:

```ts
import { toCurrencyCode } from '@vielzeug/coins';

const usd = toCurrencyCode('USD'); // CurrencyCode
const eur = toCurrencyCode('EUR'); // CurrencyCode

toCurrencyCode('XXX'); // throws RangeError for unrecognised codes
```

The `money()` factory validates its `currency` argument internally, so you don't need `toCurrencyCode` for ordinary `money()` calls.

## Arithmetic

All binary functions (`add`, `subtract`) throw `TypeError` when currencies differ:

```ts
import { add, subtract, multiply, divide, abs, negate } from '@vielzeug/coins';

const a = money('100.00', 'USD');
const b = money('30.00', 'USD');

add(a, b); // { amount: 13000n, currency: 'USD' }  ($130.00)
subtract(a, b); // { amount:  7000n, currency: 'USD' }  ($70.00)
abs(money('-50.00', 'USD')); // { amount:  5000n, currency: 'USD' }
negate(money('10.00', 'USD')); // { amount: -1000n, currency: 'USD' }

// throws TypeError: Currency mismatch: USD and EUR
add(money('10.00', 'USD'), money('10.00', 'EUR'));
```

### `multiply` and `divide`

Both accept a `number | string` scalar and an optional `RoundingMode` (default `'half-away-from-zero'`). Use strings for lossless fractional factors.

```ts
multiply(money('100.00', 'USD'), '1.5'); // $150.00
multiply(money('1.00', 'USD'), '0.339', 'floor'); // $0.33
multiply(money('1.00', 'USD'), '0.339', 'ceiling'); // $0.34

divide(money('100.00', 'USD'), 3); // $33.33
divide(money('100.00', 'USD'), 3, 'ceiling'); // $33.34

divide(money('100.00', 'USD'), 0); // throws RangeError: Division by zero
```

### `percentage(money, pct, mode?)`

Computes `pct`% of a money value — i.e. `money × (pct / 100)`. Use a string `pct` for lossless fractions. Accepts the same rounding modes as `multiply`.

```ts
import { percentage } from '@vielzeug/coins';

percentage(money('100.00', 'USD'), 10); // $10.00
percentage(money('199.99', 'USD'), '8.5'); // $17.00  (8.5% = 8.5/100 — lossless with string)
percentage(money('100.00', 'USD'), 33.33); // $33.33
percentage(money('-100.00', 'USD'), 10); // -$10.00 (sign preserved)
percentage(money('100.00', 'USD'), 0); // $0.00
```

### Rounding Modes

| Mode                    | Description                                                         |
| ----------------------- | ------------------------------------------------------------------- |
| `'half-away-from-zero'` | Round half away from zero **(default)**                             |
| `'half-even'`           | Banker's rounding — minimises cumulative error over many operations |
| `'down'`                | Truncate toward zero                                                |
| `'up'`                  | Away from zero                                                      |
| `'floor'`               | Toward −∞ (down for positives, extra step for negatives)            |
| `'ceiling'`             | Toward +∞ (extra step for positives, truncate for negatives)        |

## Allocation

Allocation distributes a `Money` value across weighted shares with a guarantee: the sum of all shares is always exactly equal to the input. No minor unit is ever lost or gained.

### `allocate(money, ratios)`

Ratios can be numbers or strings. Use strings for lossless decimal weights (e.g. `'0.333'`).

```ts
import { allocate } from '@vielzeug/coins';

// Equal split — extra penny to the first share
allocate(money('10.00', 'USD'), [1, 1, 1]);
// → [$3.34, $3.33, $3.33]  (sum = $10.00 exactly)

// Weighted split
allocate(money('10.00', 'USD'), [3, 7]);
// → [$3.00, $7.00]

// Decimal string ratios
allocate(money('10.00', 'USD'), ['0.3', '0.7']);
// → [$3.00, $7.00]

// Decimal string ratios that don't sum to 1 — proportions are normalised
allocate(money('7.00', 'USD'), ['0.333', '0.333', '0.334']);
// → [$2.33, $2.33, $2.34]  (sum = $7.00 exactly)
```

Uses the **Largest Remainder Method**: each share gets its floor allocation first, then any remainder units are assigned one-by-one to the shares with the largest fractional parts.

### `splitEvenly(money, parts)`

Sugar over `allocate` with all-equal weights.

```ts
import { splitEvenly } from '@vielzeug/coins';

splitEvenly(money('10.00', 'USD'), 3);
// → [$3.34, $3.33, $3.33]
```

## Aggregates

```ts
import { clamp, max, min, sum } from '@vielzeug/coins';

const items = [money('1.00', 'USD'), money('2.50', 'USD'), money('0.99', 'USD')];

sum(items); // $4.49
min(...items); // $0.99
max(...items); // $2.50

sum([]); // throws RangeError: sum requires at least one Money value

// Clamp to an allowed price range
const lo = money('1.00', 'USD');
const hi = money('99.99', 'USD');

clamp(money('0.50', 'USD'), lo, hi); // $1.00  (below minimum)
clamp(money('42.00', 'USD'), lo, hi); // $42.00 (in range)
clamp(money('150.00', 'USD'), lo, hi); // $99.99 (above maximum)
```

## Comparison

All comparison functions throw `TypeError` on currency mismatch.

```ts
import {
  compare,
  isEqual,
  greaterThan,
  lessThan,
  isZero,
  isPositive,
  isNegative,
  isNonNegative,
  isNonPositive,
} from '@vielzeug/coins';

const five = money('5.00', 'USD');
const ten = money('10.00', 'USD');

compare(five, ten); // -1
compare(ten, five); //  1
compare(five, five); //  0

isEqual(five, five); // true
isEqual(five, ten); // false

greaterThan(ten, five); // true
lessThan(five, ten); // true

isZero(money('0.00', 'USD')); // true
isPositive(five); // true
isNegative(money('-1.00', 'USD')); // true

// Non-strict predicates (inclusive of zero)
isNonNegative(money('0.00', 'USD')); // true  (zero or positive)
isNonNegative(money('-1.00', 'USD')); // false
isNonPositive(money('0.00', 'USD')); // true  (zero or negative)
isNonPositive(five); // false

// throws TypeError: Currency mismatch: USD and EUR
compare(money('5.00', 'USD'), money('5.00', 'EUR'));
```

## Serialization

`bigint` cannot be serialized by `JSON.stringify`. Use `toJSON` / `fromJSON` to round-trip through JSON safely:

```ts
import { toJSON, fromJSON, toDecimal, toNumber } from '@vielzeug/coins';

const price = money('1234.56', 'USD');

// JSON serialization
const serialized = toJSON(price);
// → { amount: '123456', currency: 'USD' }  (amount is a string)

JSON.stringify(serialized);
// → '{"amount":"123456","currency":"USD"}'

fromJSON(serialized); // → { amount: 123456n, currency: 'USD' }

// Round-trips
fromJSON(toJSON(price)); // equals price
money(toDecimal(price), 'USD'); // equals price

// Decimal string — useful for display or passing to other systems
toDecimal(money(5n, 'USD')); // '0.05'
toDecimal(money(1234n, 'JPY')); // '1234'

// Lossy float — for charting libraries, not arithmetic
toNumber(price); // 1234.56
```

## Formatting

### `format(money, options?)`

Produces a locale-aware currency string. Uses bigint arithmetic throughout — exact regardless of amount size.

```ts
import { format } from '@vielzeug/coins';

const price = money('1234.56', 'USD');

format(price); // '$1,234.56'
format(price, { locale: 'de-DE' }); // '1.234,56 $'
format(price, { locale: 'fr-FR' }); // '1 234,56 $'
format(price, { style: 'code' }); // 'USD 1,234.56'
format(price, { style: 'name' }); // '1,234.56 US dollars'
format(price, { style: 'narrowSymbol' }); // '$1,234.56' (compact)

// Zero-decimal currencies
format(money('1234', 'JPY')); // '¥1,234'

// Custom fraction digits — set only maximumFractionDigits when you want to truncate
format(price, { maximumFractionDigits: 0 }); // '$1,235'
format(price, { minimumFractionDigits: 3, maximumFractionDigits: 3 }); // '$1,234.560'
```

### `formatParts(money, options?)`

Returns a `MoneyFormatPart[]` array instead of a joined string. Useful for applying different CSS to each semantic part (symbol, integer, fraction, sign).

```ts
import { formatParts } from '@vielzeug/coins';

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

// Joining all values always equals format():
formatParts(m)
  .map((p) => p.value)
  .join('') === format(m); // true
```

## Currency Exchange

`exchange()` converts a `Money` value using a provided `ExchangeRate`. The `rate` field must be a **decimal string** — not a number — to avoid IEEE-754 errors in the bigint multiplication.

```ts
import { exchange, toCurrencyCode } from '@vielzeug/coins';
import type { ExchangeRate } from '@vielzeug/coins';

const usd = toCurrencyCode('USD');
const eur = toCurrencyCode('EUR');
const jpy = toCurrencyCode('JPY');

const rate: ExchangeRate = { from: usd, rate: '0.92', to: eur };

exchange(money('100.00', 'USD'), rate); // { amount: 9200n, currency: 'EUR' }
exchange(money('100.00', 'USD'), rate, 'floor'); // explicit rounding mode

// Throws TypeError if money.currency !== rate.from
exchange(money('100.00', 'EUR'), rate); // TypeError: Currency mismatch: EUR and USD

// Throws RangeError for negative or empty rates
exchange(money('100.00', 'USD'), { from: usd, rate: '-0.92', to: eur }); // RangeError: Exchange rate must be non-negative
exchange(money('100.00', 'USD'), { from: usd, rate: '', to: eur }); // RangeError: Exchange rate must be a non-empty decimal string

// High-precision rates — string parsing avoids float error
const jpyRate: ExchangeRate = { from: usd, rate: '0.847532', to: eur };
exchange(money('1000.00', 'USD'), jpyRate); // { amount: 84753n, currency: 'EUR' }
```

## Practical Patterns

### Cart Total

```ts
import { add, format, money, sum } from '@vielzeug/coins';
import type { Money } from '@vielzeug/coins';

const items: Money[] = [money('9.99', 'USD'), money('14.99', 'USD'), money('2.50', 'USD')];

const subtotal = sum(items);
const tax = multiply(subtotal, '0.08');
const total = add(subtotal, tax);

format(total); // '$29.68'
```

### Invoice Line Allocation

```ts
import { allocate, format, money } from '@vielzeug/coins';

const invoice = money('100.00', 'USD');
const [alice, bob, carol] = allocate(invoice, [50, 30, 20]);

format(alice); // '$50.00'
format(bob); // '$30.00'
format(carol); // '$20.00'
// alice.amount + bob.amount + carol.amount === 10000n  (exactly)
```

### Multi-Currency Price Display

```ts
import { exchange, format, money, toCurrencyCode } from '@vielzeug/coins';
import type { ExchangeRate } from '@vielzeug/coins';

const price = money('50.00', 'USD');
const usd = toCurrencyCode('USD');

const rates: ExchangeRate[] = [
  { from: usd, rate: '0.92', to: toCurrencyCode('EUR') },
  { from: usd, rate: '0.79', to: toCurrencyCode('GBP') },
  { from: usd, rate: '149.5', to: toCurrencyCode('JPY') },
];

for (const rate of rates) {
  console.log(format(exchange(price, rate)));
}
// €46.00
// £39.50
// ¥7,475
```

### React Custom Rendering

```ts
import { formatParts, money } from '@vielzeug/coins';

function Price({ amount, currency }: { amount: bigint; currency: string }) {
  const parts = formatParts(money(amount, currency));

  return (
    <span>
      {parts.map((part, i) =>
        part.type === 'fraction' ? (
          <sup key={i}>{part.value}</sup>
        ) : (
          <span key={i} className={part.type}>{part.value}</span>
        )
      )}
    </span>
  );
}
```

## Utilities

### `withAmount(m, amount)`

Creates a new `Money` with a different raw bigint amount while preserving the source currency. Use this when you compute a `bigint` externally and need to re-wrap it without re-validating the currency.

```ts
import { money, withAmount, toDecimal } from '@vielzeug/coins';

const price = money('9.99', 'USD');

// Compute externally, then wrap back
const rawDoubled = price.amount * 2n;
const doubled = withAmount(price, rawDoubled);
toDecimal(doubled); // '19.98'

// Useful in reduce / fold patterns on raw bigint values
const amounts = [100n, 250n, 75n];
const total = withAmount(price, amounts.reduce((a, b) => a + b, 0n));
toDecimal(total); // '4.25'
```

### `isMoney(value)`

Type guard that narrows `unknown` to `Money`. Checks own-property `bigint` `amount` and `string` `currency` — prototype-chain properties are rejected.

```ts
import { isMoney, toDecimal } from '@vielzeug/coins';

// Narrow untrusted API payloads
function displayPrice(raw: unknown): string {
  if (!isMoney(raw)) throw new TypeError('Expected a Money value');
  return toDecimal(raw);
}

displayPrice({ amount: 1999n, currency: 'USD' }); // '19.99'
displayPrice({ amount: 9.99,  currency: 'USD' }); // throws — amount is float, not bigint
displayPrice(null);                               // throws

// isMoney does NOT validate the currency code — use toCurrencyCode() for that
isMoney({ amount: 100n, currency: 'FAKE' }); // true — shape matches but code is unvalidated
```

## Working with Other Vielzeug Libraries

**With Tempo** — format monetary amounts alongside dates in the same pipeline:

```ts
import { money, format } from '@vielzeug/coins';
import { formatDate } from '@vielzeug/tempo';

const amount = money('1234.56', 'USD');
const date = new Date();

console.log(`As of ${formatDate(date, 'MMM d, yyyy')}: ${format(amount)}`);
// e.g. "As of Jun 9, 2026: $1,234.56"
```

**With Arsenal** — combine array utilities with monetary aggregation:

```ts
import { sum, money } from '@vielzeug/coins';
import { groupBy } from '@vielzeug/arsenal';

const transactions = [
  { category: 'food', amount: money('12.50', 'USD') },
  { category: 'travel', amount: money('80.00', 'USD') },
  { category: 'food', amount: money('9.75', 'USD') },
];

const byCategory = groupBy(transactions, (t) => t.category);
const foodTotal = sum(byCategory.food.map((t) => t.amount));
// foodTotal = money('22.25', 'USD')
```

**With Spell** — validate and parse currency input from user forms:

```ts
import { money, toCurrencyCode } from '@vielzeug/coins';
import { object, string } from '@vielzeug/spell';

const MoneyInput = object({
  amount: string().regex(/^\d+(\.\d{1,3})?$/),
  currency: string().transform((v) => toCurrencyCode(v)),
});

const parsed = MoneyInput.parse(formData);
const value = money(parsed.amount, parsed.currency);
```

## Best Practices

- Prefer decimal strings over numbers when constructing `money()` — `money('1234.56', 'USD')` avoids IEEE-754 rounding before the value ever reaches bigint storage.
- Always call `toCurrencyCode()` upfront when building `ExchangeRate` objects. Validate at the boundary (API response, user input), not at every call site.
- Use `allocate()` instead of manual `divide` + rounding whenever distributing a total across multiple parties — it guarantees the shares sum exactly to the original amount.
- Use `'half-even'` (banker's rounding) in bulk-processing scenarios (batch invoices, statement generation) to minimise cumulative rounding drift.
- Never store `toNumber()` output and feed it back into arithmetic. `toNumber()` is lossy — use it only for display and charting libraries.
- Pass `ExchangeRate.rate` as a string, not a number. The string is parsed into an exact rational fraction; a `number` would introduce float error before the bigint conversion.
- Use `sum()` instead of a manual reduce over `add()` — it validates currency consistency across the entire array upfront, so any mismatch is caught immediately with a clear error rather than failing at a mid-array `add()` call.

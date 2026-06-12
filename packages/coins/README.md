# @vielzeug/coins

Zero-dependency TypeScript utilities for precise monetary arithmetic — creation, arithmetic, allocation, formatting, exchange rate conversion, and serialization — using `bigint` minor units for lossless precision.

## Installation

```sh
pnpm add @vielzeug/coins
```

## Quick Start

```ts
import {
  add, allocate, exchange, format, formatParts,
  money, multiply, divide, percentage, splitEvenly, toCurrencyCode,
} from '@vielzeug/coins';

// Validate and brand a currency code
const usd = toCurrencyCode('USD');  // CurrencyCode — validated against Intl
const eur = toCurrencyCode('EUR');

// Create money values (validates currency, parses losslessly)
const price = money('1234.56', 'USD');  // { amount: 123456n, currency: 'USD' }
const tax   = money('98.77',   'USD');
const total = add(price, tax);          // { amount: 133333n, currency: 'USD' }

// Arithmetic with explicit rounding mode
multiply(total, '1.5');                   // half-away-from-zero (default)
divide(total, 3, 'ceiling');             // ceiling rounding

// Allocation — Largest Remainder Method, no penny lost or gained
allocate(money('10.00', 'USD'), [1, 1, 1]);  // [$3.34, $3.33, $3.33]
splitEvenly(money('10.00', 'USD'), 3);       // same result, sugar over allocate

// Format
format(total)                              // '$1,333.33'
format(total, { locale: 'de-DE' })         // '1.333,33 $'
format(total, { style: 'code' })           // 'USD 1,333.33'
format(total, { style: 'name' })           // '1,333.33 US dollars'

// Structured parts for custom rendering
formatParts(total)
// [
//   { type: 'currency', value: '$' },
//   { type: 'integer',  value: '1,333' },
//   { type: 'decimal',  value: '.' },
//   { type: 'fraction', value: '33' },
// ]

// Percentage
percentage(money('199.99', 'USD'), '8.5')   // $17.00  (tax computation)
percentage(money('100.00', 'USD'), 10, 'floor')  // $10.00

// Currency exchange — rate is a decimal string for lossless bigint arithmetic
exchange(total, { from: usd, rate: '0.92', to: eur });          // default rounding
exchange(total, { from: usd, rate: '0.92', to: eur }, 'floor'); // explicit mode
```

## API

### `toCurrencyCode(code)`

Validates an ISO 4217 code string against `Intl.NumberFormat` and returns it as a branded `CurrencyCode`. Throws `RangeError` for unrecognised codes. Results are cached.

```ts
const usd = toCurrencyCode('USD');    // CurrencyCode
toCurrencyCode('NOTREAL');            // throws RangeError
```

Use this when you have a plain string from user input or an API response and need to create an `ExchangeRate` or type-check a currency.

### `money(amount, currency)`

Creates a `Money` value. Validates the currency code; throws `RangeError` for unrecognised ISO 4217 codes.

| `amount` type | Behaviour |
|---|---|
| `string` `'1234.56'` | Parsed losslessly; excess digits rounded half-away-from-zero |
| `number` `1234.56` | Converted via `String()` first — IEEE-754 limits apply; prefer strings |
| `bigint` `123456n` | Used as-is (already in minor units) |

### Arithmetic

All binary functions throw `TypeError` on currency mismatch.

```ts
add(a, b)                           // → Money
subtract(a, b)                      // → Money
multiply(money, factor, mode?)      // → Money  (factor: number | string)
divide(money, divisor, mode?)       // → Money  (throws RangeError on division by zero)
abs(money)                          // → Money  (absolute value)
negate(money)                       // → Money  (sign flip)
```

### Allocation

```ts
allocate(money, ratios)             // → Money[]  (number | string ratios; use strings for lossless decimal weights)
splitEvenly(money, parts)           // → Money[]  (sugar over allocate with equal weights)
```

Uses the **Largest Remainder Method** — every output sums exactly to the input, no minor unit is ever lost or gained. Both throw `RangeError` on invalid inputs.

### Aggregates

```ts
sum([...moneys])                    // → Money  (throws RangeError if empty; TypeError on mismatch)
min(first, ...rest)                 // → Money  (throws TypeError on currency mismatch)
max(first, ...rest)                 // → Money  (throws TypeError on currency mismatch)
```

### `zero(currency)`

Creates a `Money` value with a zero amount for the given currency. Equivalent to `money(0n, currency)` but more expressive.

```ts
zero('USD')  // { amount: 0n, currency: 'USD' }
zero('JPY')  // { amount: 0n, currency: 'JPY' }
```

### `clamp(m, lower, upper)`

Clamps `m` to the inclusive range `[lower, upper]`. All three values must share the same currency. Throws `TypeError` on currency mismatch, `RangeError` if `lower > upper`.

```ts
clamp(money('5.00', 'USD'), money('1.00', 'USD'), money('10.00', 'USD'))  // $5.00
clamp(money('0.00', 'USD'), money('1.00', 'USD'), money('10.00', 'USD'))  // $1.00
clamp(money('15.00', 'USD'), money('1.00', 'USD'), money('10.00', 'USD')) // $10.00
```

### `percentage(m, pct, mode?)`

Returns `pct`% of `m`, i.e. `m × (pct / 100)`. Use a string percentage for lossless precision. Accepts an optional `RoundingMode`.

```ts
percentage(money('100.00', 'USD'), 10)      // $10.00
percentage(money('199.99', 'USD'), '8.5')   // $17.00
percentage(money('100.00', 'USD'), 10, 'floor')
```

### Comparison

All comparison functions throw `TypeError` on currency mismatch.

```ts
compare(a, b)                       // → -1 | 0 | 1
isEqual(a, b)                       // → boolean
greaterThan(a, b)                   // → boolean
greaterThanOrEqual(a, b)            // → boolean
lessThan(a, b)                      // → boolean
lessThanOrEqual(a, b)               // → boolean
isZero(money)                       // → boolean
isPositive(money)                   // → boolean
isNegative(money)                   // → boolean
isNonNegative(money)                // → boolean  (amount >= 0)
isNonPositive(money)                // → boolean  (amount <= 0)
```

### Serialization

```ts
toDecimal(money)                    // → string  e.g. '1234.56'  (round-trips with money())
toNumber(money)                     // → number  e.g. 1234.56    (lossy — display/charting only)
toJSON(money)                       // → MoneyJSON  { amount: '123456', currency: 'USD' }
fromJSON(json)                      // → Money  (validates currency; throws on invalid input)
```

`toJSON` / `fromJSON` exist because `bigint` cannot be serialized by `JSON.stringify`. Use `JSON.stringify(toJSON(price))`.

### `format(money, options?)`

Formats a `Money` value as a locale-aware currency string. Uses bigint arithmetic throughout — no floating-point precision loss for any amount.

| Option | Type | Default | Description |
|---|---|---|---|
| `locale` | `string` | `'en-US'` | BCP 47 language tag |
| `style` | `'symbol' \| 'code' \| 'name' \| 'narrowSymbol'` | `'symbol'` | Display style |
| `minimumFractionDigits` | `number` | currency default | Minimum decimal places shown |
| `maximumFractionDigits` | `number` | currency default | Maximum decimal places shown |

### `formatParts(money, options?)`

Same options as `format()`. Returns a `MoneyFormatPart[]` array of semantic segments instead of a joined string. Useful for applying CSS to individual parts (symbol, integer, fraction, sign).

Joining all `value` fields produces the same output as `format()`.

### `exchange(money, rate, mode?)`

Converts a `Money` value using an `ExchangeRate`. Throws `TypeError` if `money.currency !== rate.from`. Accepts an optional `RoundingMode` (default `'half-away-from-zero'`).

`ExchangeRate.rate` is a decimal **string** (e.g. `'0.92'`) to avoid IEEE-754 rounding errors in the bigint conversion arithmetic.

```ts
const rate = { from: toCurrencyCode('USD'), rate: '0.92', to: toCurrencyCode('EUR') };
exchange(money('100.00', 'USD'), rate);           // { amount: 9200n, currency: 'EUR' }
exchange(money('100.00', 'USD'), rate, 'floor');  // explicit rounding
```

### Rounding modes

Used by `multiply`, `divide`, and `exchange`.

| Mode | Description |
|---|---|
| `'half-away-from-zero'` | Round half away from zero **(default)** |
| `'half-even'` | Banker's rounding — minimises cumulative error |
| `'down'` | Truncate toward zero |
| `'up'` | Away from zero |
| `'floor'` | Toward −∞ |
| `'ceiling'` | Toward +∞ |

### Types

```ts
type CurrencyCode = string & { readonly [brand]: true };   // validated ISO 4217 — obtain via toCurrencyCode()

type Money = {
  readonly amount:   bigint;       // minor units (cents for USD, whole units for JPY)
  readonly currency: CurrencyCode;
};

type ExchangeRate = {
  readonly from: CurrencyCode;  // source currency
  readonly rate: string;        // decimal multiplier string, e.g. '0.92'
  readonly to:   CurrencyCode;  // target currency
};

type RoundingMode = 'ceiling' | 'down' | 'floor' | 'half-away-from-zero' | 'half-even' | 'up';

type FormatOptions = {
  locale?:                string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  style?:                 'code' | 'name' | 'symbol';
};

type MoneyFormatPart = {
  type:  'currency' | 'decimal' | 'fraction' | 'integer' | 'literal' | 'minusSign';
  value: string;
};

type MoneyJSON = { amount: string; currency: string };
```

`Money.amount` is always in **minor units** — cents for USD, the whole unit for JPY, fils for KWD (3 decimals), etc. Use `money()` to create from human-readable decimals and `toDecimal()` to convert back.

## License

MIT

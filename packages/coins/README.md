# @vielzeug/coins

> Zero-dependency TypeScript utilities for precise monetary arithmetic

Bigint-based money creation, arithmetic, allocation, formatting, exchange rate conversion, and serialization — with no floating-point rounding errors.

## Why Coins?

Float arithmetic silently loses precision:

```ts
// number (float)
10.1 + 10.2; // 20.299999999999997

// @vielzeug/coins (bigint)
import { add, money } from '@vielzeug/coins';
add(money('10.10', 'USD'), money('10.20', 'USD')); // { amount: 2030n, currency: 'USD' }  — exact
```

Coins stores every value as bigint **minor units** (cents for USD, whole units for JPY, fils for KWD), so arithmetic and allocation are always lossless.

## Installation

```sh
pnpm add @vielzeug/coins
```

## Quick Start

```ts
import { add, allocate, exchange, format, money, multiply } from '@vielzeug/coins';
import type { ExchangeRate, Money } from '@vielzeug/coins';

// Create money from a decimal string (lossless) or bigint minor units
const price: Money = money('19.99', 'USD'); // { amount: 1999n, currency: 'USD' }
const tax: Money = money('1.60', 'USD');
const total: Money = add(price, tax); // { amount: 3559n, currency: 'USD' }

// Arithmetic with explicit rounding mode
multiply(total, '1.1'); // $39.15  (half-away-from-zero, default)
multiply(total, '1.1', 'floor'); // $39.14  (explicit mode)

// Lossless allocation — no minor unit is ever lost or gained
allocate(money('10.00', 'USD'), [1, 1, 1]); // [$3.34, $3.33, $3.33]

// Locale-aware formatting
format(total); // '$35.59'
format(total, { locale: 'de-DE' }); // '35,59 $'
format(total, { style: 'code' }); // 'USD 35.59'

// Currency exchange — ExchangeRate.from/to are plain strings; rate is a decimal string or number
const rate: ExchangeRate = { from: 'USD', rate: '0.92', to: 'EUR' };
exchange(total, rate); // { amount: 3274n, currency: 'EUR' }
```

## API

### `money(amount, currency)`

Creates a `Money` value. Validates the currency code against `Intl.NumberFormat`; throws `InvalidCurrencyError` for unrecognised ISO 4217 codes.

| `amount` type        | Behaviour                                                              |
| -------------------- | ---------------------------------------------------------------------- |
| `string` `'1234.56'` | Parsed losslessly; excess digits rounded half-away-from-zero           |
| `number` `1234.56`   | Converted via `String()` first — IEEE-754 limits apply; prefer strings |
| `bigint` `123456n`   | Used as-is (already in minor units)                                    |

```ts
money('1234.56', 'USD'); // { amount: 123456n, currency: 'USD' }
money(0n, 'USD'); // { amount: 0n, currency: 'USD' }  — zero accumulator
money('1.00', 'FAKE'); // throws InvalidCurrencyError
```

### Arithmetic

All binary functions (`add`, `subtract`) throw `CurrencyMismatchError` on currency mismatch.

```ts
add(a, b); // → Money
subtract(a, b); // → Money
multiply(money, factor, mode?); // → Money  (factor: number | string)
divide(money, divisor, mode?); // → Money  (throws RangeError on division by zero)
abs(money); // → Money  (absolute value)
negate(money); // → Money  (sign flip)
```

### Allocation

Uses the **Largest Remainder Method** — every output sums exactly to the input, no minor unit is ever lost or gained.

```ts
allocate(money, ratios); // → [Money, ...Money[]]  (weighted; use strings for lossless decimal ratios)
splitEvenly(money, parts); // → [Money, ...Money[]]  (equal shares; sugar over allocate)
```

Both throw `RangeError` on empty ratios, negative ratios, or non-positive parts.

### Aggregates

```ts
sum(moneys); // → Money  (throws RangeError if empty; CurrencyMismatchError on mismatch)
min(moneys); // → Money  (non-empty array; CurrencyMismatchError on mismatch)
max(moneys); // → Money  (non-empty array; CurrencyMismatchError on mismatch)
clamp(m, lower, upper); // → Money  (CurrencyMismatchError on mismatch; RangeError if lower > upper)
```

### Comparison

`isEqual` returns `false` on currency mismatch (safe for `.filter()`). All other comparison functions throw `CurrencyMismatchError` on mismatch.

```ts
compare(a, b); // → -1 | 0 | 1
isEqual(a, b); // → boolean  (false on currency mismatch — no throw)
greaterThan(a, b); // → boolean
greaterThanOrEqual(a, b); // → boolean
lessThan(a, b); // → boolean
lessThanOrEqual(a, b); // → boolean
isZero(m); // → boolean
isPositive(m); // → boolean
isNegative(m); // → boolean
isNonNegative(m); // → boolean  (>= 0)
isNonPositive(m); // → boolean  (<= 0)
```

### Serialization

```ts
toDecimal(money); // → string   e.g. '1234.56'  (round-trips losslessly with money())
toNumber(money); // → number   e.g. 1234.56    (lossy — display/charting only)
toJSON(money); // → MoneyJSON  { amount: '123456', currency: 'USD' }
fromJSON(json); // → Money     (validates currency; throws on invalid input)
```

`bigint` cannot be serialized by `JSON.stringify`. Use `JSON.stringify(toJSON(price))` and `fromJSON(JSON.parse(raw))`.

### `roundTo(money, places, mode?)`

Rounds a `Money` value to fewer decimal places than the currency default — useful for display (whole dollars, chart axes). `places` must be in `0..currencyDecimals`.

```ts
roundTo(money('1234.56', 'USD'), 0); // { amount: 1235n, currency: 'USD' }  ($1,235)
roundTo(money('1234.56', 'USD'), 1, 'floor'); // { amount: 12345n, currency: 'USD' } ($1,234.5)
```

### `format(money, options?)`

Formats a `Money` value as a locale-aware currency string. Uses bigint arithmetic throughout — no floating-point precision loss.

| Option                  | Type                                              | Default          | Description                  |
| ----------------------- | ------------------------------------------------- | ---------------- | ---------------------------- |
| `locale`                | `string`                                          | `'en-US'`        | BCP 47 language tag          |
| `style`                 | `'symbol' \| 'code' \| 'name' \| 'narrowSymbol'` | `'symbol'`       | Display style                |
| `minimumFractionDigits` | `number`                                          | currency default | Minimum decimal places shown |
| `maximumFractionDigits` | `number`                                          | currency default | Maximum decimal places shown |

```ts
format(money('1234.56', 'USD')); // '$1,234.56'
format(money('1234.56', 'USD'), { locale: 'de-DE' }); // '1.234,56 $'
format(money('1234.56', 'USD'), { style: 'code' }); // 'USD 1,234.56'
```

### `formatParts(money, options?)`

Same options as `format()`. Returns a `MoneyFormatPart[]` array of semantic segments — useful for applying separate styles to symbol, integer, decimal, and fraction parts.

Joining all `value` fields produces the same string as `format()`.

### `exchange(money, rate, mode?)`

Converts a `Money` value using an `ExchangeRate`. `ExchangeRate.from` and `.to` are plain strings; `rate.rate` is a decimal string or number (`number | string`, for symmetry with `multiply()`/`divide()` — prefer a string for lossless bigint arithmetic). Throws `CurrencyMismatchError` if `money.currency !== rate.from`.

```ts
import type { ExchangeRate } from '@vielzeug/coins';

const rate: ExchangeRate = { from: 'USD', rate: '0.92', to: 'EUR' };
exchange(money('100.00', 'USD'), rate); // { amount: 9200n, currency: 'EUR' }
exchange(money('100.00', 'USD'), rate, 'floor'); // explicit rounding mode
```

### Typed Errors

```ts
import { CurrencyMismatchError, InvalidCurrencyError } from '@vielzeug/coins';

try {
  add(money('1.00', 'USD'), money('1.00', 'EUR'));
} catch (e) {
  if (e instanceof CurrencyMismatchError) {
    console.log(e.expected, e.received); // 'USD' 'EUR'
  }
}

try {
  money('1.00', 'FAKE');
} catch (e) {
  if (e instanceof InvalidCurrencyError) {
    console.log(e.code); // 'FAKE'
  }
}
```

- `CurrencyMismatchError` extends `TypeError` — existing `instanceof TypeError` catch blocks still work.
- `InvalidCurrencyError` extends `RangeError` — existing `instanceof RangeError` catch blocks still work.

### Rounding Modes

Used by `multiply`, `divide`, `exchange`, and `roundTo`.

| Mode                    | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `'half-away-from-zero'` | Round half away from zero **(default)**        |
| `'half-even'`           | Banker's rounding — minimises cumulative error |
| `'down'`                | Truncate toward zero                           |
| `'up'`                  | Away from zero                                 |
| `'floor'`               | Toward −∞                                      |
| `'ceiling'`             | Toward +∞                                      |

### Key Types

```ts
type Money = {
  readonly amount: bigint; // minor units (cents for USD, whole units for JPY)
  readonly currency: string; // validated ISO 4217 code
};

type ExchangeRate = {
  readonly from: string; // source currency code
  readonly rate: number | string; // decimal multiplier, e.g. '0.92' or 0.92
  readonly to: string; // target currency code
};

type RoundingMode = 'ceiling' | 'down' | 'floor' | 'half-away-from-zero' | 'half-even' | 'up';

type FormatOptions = {
  locale?: string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  style?: 'code' | 'name' | 'narrowSymbol' | 'symbol';
};

type MoneyFormatPart = {
  type: 'currency' | 'decimal' | 'fraction' | 'integer' | 'literal' | 'minusSign';
  value: string;
};

type MoneyJSON = { amount: string; currency: string };
```

## Documentation

- **[Full Guide](https://vielzeug.dev/coins/)** — Overview, concepts, quick start
- **[Usage Guide](https://vielzeug.dev/coins/usage/)** — Common patterns and best practices
- **[API Reference](https://vielzeug.dev/coins/api/)** — All types and function signatures
- **[Examples](https://vielzeug.dev/coins/examples/)** — Real-world integration examples

## TypeScript

Requires TypeScript 5.0+ with `strict: true`.

## License

MIT

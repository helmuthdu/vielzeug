# @vielzeug/coins

Zero-dependency TypeScript utilities for precise monetary arithmetic — creation, arithmetic, formatting, and exchange rate conversion using `bigint` for lossless precision.

## Installation

```sh
pnpm add @vielzeug/coins
```

## Quick Start

```ts
import { allocate, exchange, format, money, add, subtract, multiply, divide } from '@vielzeug/coins';

// Create money values from decimal strings (preferred) or numbers
const price  = money('1234.56', 'USD');   // { amount: 123456n, currency: 'USD' }
const tax    = money('98.77',   'USD');
const total  = add(price, tax);           // $1,333.33

// Arithmetic
subtract(total, money('10.00', 'USD'));   // $1,323.33
multiply(total, '1.5');                   // $2,000.00
divide(total, 3, 'ceiling');             // $444.45

// Lossless allocation — no penny lost or gained
allocate(money('10.00', 'USD'), [1, 1, 1]);
// → [$3.34, $3.33, $3.33]

// Format
format(total)                              // '$1,333.33'
format(total, { locale: 'de-DE' })        // '1.333,33 $'
format(total, { style: 'code' })          // 'USD 1,333.33'
format(total, { style: 'name' })          // '1,333.33 US dollars'

// Exchange (rate is a decimal string for lossless precision)
const rate = { from: 'USD', to: 'EUR', rate: '0.92' };
exchange(total, rate);                     // { amount: 122666n, currency: 'EUR' }
exchange(total, rate, 'floor');            // with explicit rounding mode
```

## API

### `money(amount, currency)`

Creates a `Money` value. Validates the ISO 4217 currency code — throws `RangeError` on unrecognised codes.

| `amount` type | Behaviour |
|---|---|
| `string` `'1234.56'` | Parsed losslessly; rounds excess digits half-away-from-zero |
| `number` `1234.56` | Converted via `String()` first — IEEE-754 limits apply |
| `bigint` `123456n` | Used as-is (already minor units) |

### Arithmetic

```ts
add(a, b)                           // → Money  (throws on currency mismatch)
subtract(a, b)                      // → Money  (throws on currency mismatch)
multiply(money, factor, mode?)      // → Money  (factor: number | string)
divide(money, divisor, mode?)       // → Money  (throws on division by zero)
abs(money)                          // → Money  (absolute value)
negate(money)                       // → Money  (sign flip)
```

### Allocation

```ts
allocate(money, ratios)             // → Money[]  (never loses or gains a minor unit)
```

Uses the **Largest Remainder Method**: each share gets its floor allocation first, then
any remainder units go to the shares with the largest fractional remainders.

### Aggregates

```ts
sum([...moneys])                    // → Money  (throws if empty or mixed currencies)
min(a, ...rest)                     // → Money  (throws on currency mismatch)
max(a, ...rest)                     // → Money  (throws on currency mismatch)
```

### Comparison

```ts
compare(a, b)                       // → -1 | 0 | 1
isEqual(a, b)                       // → boolean  (no currency mismatch check)
greaterThan(a, b)                   // → boolean
greaterThanOrEqual(a, b)            // → boolean
lessThan(a, b)                      // → boolean
lessThanOrEqual(a, b)               // → boolean
isZero(money)                       // → boolean
isPositive(money)                   // → boolean
isNegative(money)                   // → boolean
```

### Serialization

```ts
toDecimal(money)                    // → string  e.g. '1234.56'  (round-trips with money())
toNumber(money)                     // → number  e.g. 1234.56    (lossy — for display/charting only)
toJSON(money)                       // → MoneyJSON  { amount: '123456', currency: 'USD' }
fromJSON(json)                      // → Money  (validates currency; throws on invalid amount)
```

`toJSON` / `fromJSON` exist because `bigint` is not JSON-serializable. `JSON.stringify(toJSON(price))` works.

### `format(money, options?)`

Formats a `Money` value as a locale-aware currency string.

| Option | Type | Default | Description |
|---|---|---|---|
| `locale` | `string` | `'en-US'` | BCP 47 language tag |
| `style` | `'symbol' \| 'code' \| 'name'` | `'symbol'` | Display style |
| `minimumFractionDigits` | `number` | currency default | Minimum decimal places |
| `maximumFractionDigits` | `number` | currency default | Maximum decimal places |

### `exchange(money, rate, mode?)`

Converts a `Money` value using an `ExchangeRate`. Throws if `money.currency !== rate.from`.
Accepts an optional `RoundingMode` (default `'half-away-from-zero'`).

### Rounding modes

Used by `multiply`, `divide`, and `exchange` for fractional minor unit results.

| Mode | Description |
|---|---|
| `'half-away-from-zero'` | Round half away from zero **(default)** |
| `'half-even'` | Banker's rounding (minimises cumulative error) |
| `'down'` | Truncate toward zero |
| `'up'` | Away from zero |
| `'floor'` | Toward −∞ |
| `'ceiling'` | Toward +∞ |

### Types

```ts
type Money        = { amount: bigint; currency: string };
type ExchangeRate = { from: string; rate: string; to: string };
type MoneyJSON    = { amount: string; currency: string };
type RoundingMode = 'ceiling' | 'down' | 'floor' | 'half-away-from-zero' | 'half-even' | 'up';
type FormatOptions = { locale?: string; style?: 'code' | 'name' | 'symbol'; minimumFractionDigits?: number; maximumFractionDigits?: number };
```

**`ExchangeRate.rate` is a `string`** to avoid IEEE-754 rounding errors during conversion arithmetic.

**`Money.amount` is in minor units** (e.g. cents for USD, the whole unit for JPY). Use `money()` to construct values from human-readable decimals, and `toDecimal()` to convert back.

## License

MIT

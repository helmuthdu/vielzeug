---
title: Coins — API Reference
description: Complete API reference for @vielzeug/coins.
---

[[toc]]

## API Overview

| Symbol                                       | Purpose                                                       | Execution | Common gotcha                                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `money()`                                    | Create a `Money` value from decimal string / number / bigint  | Sync      | Number input is converted via `String()` — IEEE-754 limits apply; dev warning fires when float has more decimals than currency supports |
| `add()` / `subtract()`                       | Add or subtract same-currency values                          | Sync      | Throws `CurrencyMismatchError` on currency mismatch                                                                                     |
| `multiply()`                                 | Scale a money value by a factor                               | Sync      | Default rounding is `'half-away-from-zero'`; use string factors for lossless fractions                                                  |
| `divide()`                                   | Divide a money value by a divisor                             | Sync      | Throws `RangeError` on division by zero                                                                                                 |
| `abs()` / `negate()`                         | Absolute value / sign flip                                    | Sync      |                                                                                                                                         |
| `roundTo()`                                  | Round to fewer decimal places than currency default           | Sync      | `places` must be `0..currencyDecimals`; throws `RangeError` if out of range                                                             |
| `allocate()`                                 | Distribute across weighted shares (LRM)                       | Sync      | All ratios zero → `RangeError`; any negative ratio → `RangeError`                                                                       |
| `splitEvenly()`                              | Distribute into equal shares                                  | Sync      | Sugar over `allocate`; non-positive `parts` → `RangeError`                                                                              |
| `sum()`                                      | Sum an array of money values                                  | Sync      | Empty array → `RangeError`; mixed currencies → `CurrencyMismatchError`                                                                  |
| `min()` / `max()`                            | Smallest / largest value                                      | Sync      | Accepts a non-empty array; throws `CurrencyMismatchError` on mismatch, `RangeError` for empty array                                     |
| `clamp()`                                    | Clamp to `[lower, upper]` range                               | Sync      | Throws `CurrencyMismatchError` on mismatch; `RangeError` if `lower > upper`                                                             |
| `compare()`                                  | Three-way comparison                                          | Sync      | Throws `CurrencyMismatchError` on currency mismatch                                                                                     |
| `isEqual()`                                  | Equality check                                                | Sync      | Returns `false` on currency mismatch (does not throw)                                                                                   |
| `greaterThan()` / `lessThan()` etc.          | Boolean comparisons                                           | Sync      | Throw `CurrencyMismatchError` on currency mismatch                                                                                      |
| `CurrencyMismatchError`                      | Typed error — currency mismatch                               | —         | Extends `TypeError`; has `expected` and `received` properties                                                                           |
| `InvalidCurrencyError`                       | Typed error — unknown currency code                           | —         | Extends `RangeError`; has `code` property                                                                                               |
| `isZero()` / `isPositive()` / `isNegative()` | Sign predicates                                               | Sync      |                                                                                                                                         |
| `isNonNegative()` / `isNonPositive()`        | Non-strict sign predicates (>= 0 / <= 0)                      | Sync      |                                                                                                                                         |
| `format()`                                   | Locale-aware currency string                                  | Sync      | Uses `Intl.NumberFormat`; `maximumFractionDigits < minimumFractionDigits` → `RangeError`                                                |
| `formatParts()`                              | Typed part array for custom rendering                         | Sync      | Joining all `value` fields equals `format()` output                                                                                     |
| `exchange()`                                 | Convert between currencies                                    | Sync      | `rate` must be a non-negative decimal string; `from`/`to` are plain strings; throws `CurrencyMismatchError` on mismatch                 |
| `toDecimal()`                                | Minor units → decimal string                                  | Sync      | Round-trips losslessly with `money()`                                                                                                   |
| `toNumber()`                                 | Minor units → float                                           | Sync      | Lossy — for display and charting only, never for arithmetic                                                                             |
| `toJSON()` / `fromJSON()`                    | Serialize / deserialize through JSON                          | Sync      | `amount` is a string in `MoneyJSON` because `bigint` is not JSON-serializable                                                           |
| `withAmount()`                               | Clone a `Money` with a different amount (same currency)       | Sync      |                                                                                                                                         |
| `isMoney()`                                  | Type guard — checks own `bigint` amount and `string` currency | Sync      | Does not validate the currency code — shape check only                                                                                  |
| `validateCurrencyCode()`                     | Pre-validate an ISO 4217 code; throws `InvalidCurrencyError`  | Sync      | Returns the code string on success; same validation as `money()`                                                                        |
| `getCurrencyDecimals()`                      | Return the minor-unit decimal count for a currency code       | Sync      | Throws `InvalidCurrencyError` for unknown codes; results are cached                                                                     |

## Package Entry Point

| Import            | Purpose                      |
| ----------------- | ---------------------------- |
| `@vielzeug/coins` | All public exports and types |

## Factories

### `money(amount, currency)`

```ts
function money(amount: bigint | number | string, currency: string): Money;
```

Creates a `Money` value. The `currency` argument is validated against `Intl.NumberFormat`. Throws `InvalidCurrencyError` for unrecognised currencies; throws `RangeError` for invalid decimal strings.

| `amount` type        | Behaviour                                                        |
| -------------------- | ---------------------------------------------------------------- |
| `string` `'1234.56'` | Parsed losslessly; extra digits rounded half-away-from-zero      |
| `number` `1234.56`   | Converted via `String()` — IEEE-754 limits apply; prefer strings |
| `bigint` `123456n`   | Used as-is (already in minor units)                              |

> **Dev warning:** In development builds, passing a `number` with more decimal places than the currency supports (e.g. `money(0.123, 'USD')`) emits a `console.warn` via `[@vielzeug/coins]`. This is a sign of potential IEEE-754 precision loss. Use a decimal string instead.

```ts
money('1234.56', 'USD'); // { amount: 123456n, currency: 'USD' }
money(1234.56, 'USD'); // { amount: 123456n, currency: 'USD' }
money(123456n, 'USD'); // { amount: 123456n, currency: 'USD' }
money('1234', 'JPY'); // { amount: 1234n,   currency: 'JPY' }
money('1.234', 'KWD'); // { amount: 1234n,   currency: 'KWD' }
```

## Arithmetic

All binary arithmetic functions throw `CurrencyMismatchError` (extends `TypeError`) when the two `Money` values have different currencies.

### `add(a, b)`

```ts
function add(a: Money, b: Money): Money;
```

### `subtract(a, b)`

```ts
function subtract(a: Money, b: Money): Money;
```

### `multiply(money, factor, mode?)`

```ts
function multiply(m: Money, factor: number | string, mode?: RoundingMode): Money;
```

Multiplies `m.amount` by `factor`. Use a decimal string for lossless fractional factors. Defaults to `'half-away-from-zero'` rounding.

```ts
multiply(money('100.00', 'USD'), '1.5'); // $150.00
multiply(money('1.00', 'USD'), '0.339', 'floor'); // $0.33
multiply(money('1.00', 'USD'), '0.339', 'ceiling'); // $0.34
```

### `divide(money, divisor, mode?)`

```ts
function divide(m: Money, divisor: number | string, mode?: RoundingMode): Money;
```

Divides `m.amount` by `divisor`. Throws `RangeError` on division by zero.

```ts
divide(money('100.00', 'USD'), 3); // $33.33
divide(money('100.00', 'USD'), 3, 'ceiling'); // $33.34
divide(money('100.00', 'USD'), 0); // throws RangeError
```

### `abs(money)`

```ts
function abs(m: Money): Money;
```

Returns the absolute value. Negative amounts become positive.

### `negate(money)`

```ts
function negate(m: Money): Money;
```

Returns the money with its sign flipped.

## Allocation

### `allocate(money, ratios)`

```ts
function allocate(m: Money, ratios: readonly (number | string)[]): [Money, ...Money[]];
```

Distributes `m` across `ratios` using the **Largest Remainder Method**. The sum of all returned values is always exactly equal to `m` — no minor unit is ever lost or gained.

Ratios are proportional — they do not need to sum to 1. Accepts number or string ratios; use strings for lossless decimal weights.

Throws `RangeError` if:

- `ratios` is empty
- any ratio is negative (including negative string ratios like `'-0.5'`)
- all ratios are zero

```ts
allocate(money('10.00', 'USD'), [1, 1, 1]);
// [{ amount: 334n, ... }, { amount: 333n, ... }, { amount: 333n, ... }]

allocate(money('10.00', 'USD'), ['0.3', '0.7']);
// [{ amount: 300n, ... }, { amount: 700n, ... }]
```

### `splitEvenly(money, parts)`

```ts
function splitEvenly(m: Money, parts: number): [Money, ...Money[]];
```

Splits `m` into `parts` equal shares. Equivalent to `allocate(m, Array(parts).fill(1))`. Throws `RangeError` if `parts` is not a positive integer.

## Aggregates

### `sum(moneys)`

```ts
function sum(moneys: readonly Money[]): Money;
```

Sums an array of `Money` values. Throws `RangeError` if empty. Throws `CurrencyMismatchError` on currency mismatch.

### `min(moneys)` · `max(moneys)`

```ts
function min(moneys: readonly Money[]): Money;
function max(moneys: readonly Money[]): Money;
```

Returns the smallest / largest value from a non-empty array. Throws `CurrencyMismatchError` on currency mismatch. Throws `RangeError` for an empty array.

```ts
min([money('3.00', 'USD'), money('1.00', 'USD'), money('2.00', 'USD')]); // $1.00
max([money('1.00', 'USD'), money('3.00', 'USD')]); // $3.00
```

### `clamp(m, lower, upper)`

```ts
function clamp(m: Money, lower: Money, upper: Money): Money;
```

Clamps `m` to the inclusive range `[lower, upper]`. Returns `lower` if `m < lower`, `upper` if `m > upper`, or `m` unchanged if within bounds.

Throws `CurrencyMismatchError` on currency mismatch. Throws `RangeError` if `lower > upper`.

```ts
const lo = money('1.00', 'USD');
const hi = money('10.00', 'USD');

clamp(money('5.00', 'USD'), lo, hi); // $5.00  (within range)
clamp(money('0.50', 'USD'), lo, hi); // $1.00  (below lower)
clamp(money('15.00', 'USD'), lo, hi); // $10.00 (above upper)
```

## Comparison

Most comparison functions throw `CurrencyMismatchError` when currencies differ. `isEqual` is the exception — it returns `false` on currency mismatch.

### `compare(a, b)`

```ts
function compare(a: Money, b: Money): -1 | 0 | 1;
```

Returns `-1` if `a < b`, `0` if equal, `1` if `a > b`.

### `isEqual(a, b)`

```ts
function isEqual(a: Money, b: Money): boolean;
```

Returns `true` if both amount and currency are identical. Returns `false` if currencies differ (does not throw). Safe to use in `.filter()` and conditional chains across mixed-currency arrays.

### `greaterThan(a, b)` · `greaterThanOrEqual(a, b)` · `lessThan(a, b)` · `lessThanOrEqual(a, b)`

```ts
function greaterThan(a: Money, b: Money): boolean;
function greaterThanOrEqual(a: Money, b: Money): boolean;
function lessThan(a: Money, b: Money): boolean;
function lessThanOrEqual(a: Money, b: Money): boolean;
```

### `isZero(money)` · `isPositive(money)` · `isNegative(money)` · `isNonNegative(money)` · `isNonPositive(money)`

```ts
function isZero(m: Money): boolean; // amount === 0n
function isPositive(m: Money): boolean; // amount > 0n
function isNegative(m: Money): boolean; // amount < 0n
function isNonNegative(m: Money): boolean; // amount >= 0n
function isNonPositive(m: Money): boolean; // amount <= 0n
```

## Serialization

### `toDecimal(money)`

```ts
function toDecimal(m: Money): string;
```

Converts minor units to a decimal string. Round-trips losslessly with `money()`.

```ts
toDecimal(money(123456n, 'USD')); // '1234.56'
toDecimal(money(5n, 'USD')); // '0.05'
toDecimal(money(1234n, 'JPY')); // '1234'
```

### `toNumber(money)`

```ts
function toNumber(m: Money): number;
```

Converts to a floating-point number. **Lossy** — for charting and display only, never for arithmetic.

### `toJSON(money)` · `fromJSON(json)`

```ts
function toJSON(m: Money): MoneyJSON;
function fromJSON(json: MoneyJSON): Money;
```

Serializes/deserializes a `Money` value to/from a plain JSON-safe object. `amount` is a bigint string to survive `JSON.stringify`. `fromJSON` validates the currency code and throws `TypeError` for invalid or non-string `amount` fields (number, bigint, or non-integer strings are all rejected).

```ts
toJSON(money('1234.56', 'USD'));
// { amount: '123456', currency: 'USD' }

fromJSON({ amount: '123456', currency: 'USD' });
// { amount: 123456n, currency: 'USD' }
```

## Formatting

### `format(money, options?)`

```ts
function format(m: Money, options?: FormatOptions): string;
```

Formats a `Money` value as a locale-aware currency string using bigint arithmetic. No floating-point precision loss for any amount.

#### `FormatOptions`

| Field                   | Type                                             | Default                                        | Description                                                                                  |
| ----------------------- | ------------------------------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `locale`                | `string`                                         | `'en-US'`                                      | BCP 47 language tag                                                                          |
| `style`                 | `'symbol' \| 'code' \| 'name' \| 'narrowSymbol'` | `'symbol'`                                     | Currency display style (`'narrowSymbol'` renders compact symbols, e.g. `$` instead of `CA$`) |
| `minimumFractionDigits` | `number`                                         | `min(currency default, maximumFractionDigits)` | Minimum decimal places shown                                                                 |
| `maximumFractionDigits` | `number`                                         | currency default                               | Maximum decimal places shown                                                                 |

Throws `RangeError` if `minimumFractionDigits > maximumFractionDigits` or if either is negative or non-integer.

```ts
format(money('1234.56', 'USD')); // '$1,234.56'
format(money('1234.56', 'USD'), { locale: 'de-DE' }); // '1.234,56 $'
format(money('1234.56', 'USD'), { style: 'code' }); // 'USD 1,234.56'
format(money('1234.56', 'USD'), { style: 'name' }); // '1,234.56 US dollars'
format(money('1234.56', 'USD'), { style: 'narrowSymbol' }); // '$1,234.56' (compact)
format(money('1234', 'JPY')); // '¥1,234'

// Only maximumFractionDigits — no need to also set minimumFractionDigits
format(money('100.99', 'USD'), { maximumFractionDigits: 0 }); // '$101'
```

---

### `formatParts(money, options?)`

```ts
function formatParts(m: Money, options?: FormatOptions): MoneyFormatPart[];
```

Same options as `format()`. Returns an array of typed part objects instead of a joined string. Useful for applying different styles to each semantic segment.

Joining all `value` fields always produces the same output as `format(m, options)`.

```ts
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
```

## Currency Exchange

### `exchange(money, rate, mode?)`

```ts
function exchange(m: Money, rate: ExchangeRate, mode?: RoundingMode): Money;
```

Converts `m` to the currency specified in `rate.to` using lossless bigint arithmetic. The `rate.rate` field must be a decimal string.

Throws `CurrencyMismatchError` if `m.currency !== rate.from`. Throws `InvalidCurrencyError` if `rate.to` is not a recognised ISO 4217 code. Throws `RangeError` if `rate.rate` is negative or an empty string. `ExchangeRate.from` and `.to` are plain strings. Accepts an optional `RoundingMode` (default `'half-away-from-zero'`).

```ts
exchange(money('100.00', 'USD'), { from: 'USD', rate: '0.92', to: 'EUR' });
// { amount: 9200n, currency: 'EUR' }

exchange(money('100.00', 'USD'), { from: 'USD', rate: '0.92', to: 'EUR' }, 'floor');
// { amount: 9200n, currency: 'EUR' }  (same here — exact result)
```

## Utilities

### `withAmount(m, amount)`

```ts
function withAmount(m: Money, amount: bigint): Money;
```

Creates a new `Money` with the given `amount` and the same currency as `m`. Useful when you compute a raw `bigint` externally and need to wrap it back without re-validating the currency.

```ts
const price = money('9.99', 'USD');
withAmount(price, 1999n); // { amount: 1999n, currency: 'USD' }
withAmount(price, -500n); // { amount: -500n, currency: 'USD' }
```

---

### `isMoney(value)`

```ts
function isMoney(value: unknown): value is Money;
```

Type guard that returns `true` if `value` is a `Money`-shaped object — has an own `bigint` `amount` and an own `string` `currency`. Uses `hasOwnProperty` to guard against prototype-chain properties.

Does **not** validate the currency code — shape check only.

```ts
isMoney({ amount: 100n, currency: 'USD' }); // true
isMoney({ amount: 1.5, currency: 'USD' }); // false
isMoney(null); // false
isMoney(Object.create({ amount: 100n, currency: 'USD' })); // false (prototype only)
```

---

### `validateCurrencyCode(code)`

```ts
function validateCurrencyCode(code: string): string;
```

Validates a currency code string against `Intl.NumberFormat`. Returns the code unchanged on success. Throws `InvalidCurrencyError` if the code is not a recognised ISO 4217 currency. Uses the same underlying check as `money()` — results are cached, so repeated calls for the same code are cheap.

Useful when you need to validate a currency code before constructing a `Money` value, or when building validated lookup structures.

```ts
validateCurrencyCode('USD'); // 'USD'
validateCurrencyCode('FAKE'); // throws InvalidCurrencyError: Invalid ISO 4217 currency code: "FAKE"

// Pre-validate before constructing
const code = validateCurrencyCode(userInput);
const m = money(0n, code); // no re-validation cost — cached
```

---

### `getCurrencyDecimals(currencyCode)`

```ts
function getCurrencyDecimals(currencyCode: string): number;
```

Returns the number of minor-unit decimal places for a given ISO 4217 currency code (e.g. `USD→2`, `JPY→0`, `KWD→3`). Uses `Intl.NumberFormat` internally; results are cached for performance. Throws `InvalidCurrencyError` for unrecognised codes.

Useful when building custom formatters or when you need to know the precision for a currency before constructing a `Money` value.

```ts
getCurrencyDecimals('USD'); // 2
getCurrencyDecimals('JPY'); // 0
getCurrencyDecimals('KWD'); // 3
getCurrencyDecimals('FAKE'); // throws InvalidCurrencyError
```

## Rounding

### `roundTo(money, places, mode?)`

```ts
function roundTo(m: Money, places: number, mode?: RoundingMode): Money;
```

Rounds a `Money` value to fewer decimal places than the currency's default. Useful for display purposes (e.g. rounding USD cents to whole dollars).

`places` must be a non-negative integer in the range `0..currencyDecimals`. Returns `m` unchanged when `places === currencyDecimals`. Throws `RangeError` if out of range.

```ts
roundTo(money('1234.56', 'USD'), 0); // { amount: 1235n, currency: 'USD' }  ($1,235)
roundTo(money('1234.56', 'USD'), 1); // { amount: 12346n, currency: 'USD' } ($1,234.6)
roundTo(money('1234.56', 'USD'), 1, 'floor'); // { amount: 12345n, currency: 'USD' } ($1,234.5)
roundTo(money(1234n, 'JPY'), 0); // no-op — JPY has 0 decimal places
```

## Rounding Modes

Used by `multiply`, `divide`, `exchange`, and `roundTo` when the result contains a fractional minor unit.

| Mode                    | Description                                        |
| ----------------------- | -------------------------------------------------- |
| `'half-away-from-zero'` | Round half away from zero **(default)**            |
| `'half-even'`           | Banker's rounding — nearest even integer at halves |
| `'down'`                | Truncate toward zero                               |
| `'up'`                  | Away from zero                                     |
| `'floor'`               | Toward −∞                                          |
| `'ceiling'`             | Toward +∞                                          |

## Error Types

### `CurrencyMismatchError`

```ts
class CurrencyMismatchError extends TypeError {
  readonly expected: string; // currency of the first operand
  readonly received: string; // currency of the mismatching operand
}
```

Thrown by all functions that require same-currency operands (`add`, `subtract`, `compare`, `sum`, `min`, `max`, `clamp`, `exchange`, etc.). Extends `TypeError` — existing `instanceof TypeError` catch blocks continue to work.

```ts
try {
  add(money('1.00', 'USD'), money('1.00', 'EUR'));
} catch (e) {
  if (e instanceof CurrencyMismatchError) {
    console.log(e.expected, e.received); // 'USD' 'EUR'
  }
}
```

---

### `InvalidCurrencyError`

```ts
class InvalidCurrencyError extends RangeError {
  readonly code: string; // the unrecognised currency code
}
```

Thrown by `money`, `exchange` (for invalid `rate.to`), `validateCurrencyCode`, and any other function that validates a currency string. Extends `RangeError` — existing `instanceof RangeError` catch blocks continue to work.

```ts
try {
  money('1.00', 'FAKE');
} catch (e) {
  if (e instanceof InvalidCurrencyError) {
    console.log('Bad code:', e.code); // 'FAKE'
  }
}
```

---

## Types

### `CurrencyCode`

```ts
type CurrencyCode = string;
```

A type alias for `string`. Currency codes are validated at runtime (via `Intl.NumberFormat`) when passed to `money()` or `exchange()`.

---

### `Money`

```ts
type Money = {
  readonly amount: bigint; // minor units (cents for USD, whole units for JPY)
  readonly currency: string; // validated ISO 4217 code
};
```

---

### `ExchangeRate`

```ts
type ExchangeRate = {
  readonly from: string; // source currency code
  readonly rate: string; // decimal multiplier string, e.g. '0.92'
  readonly to: string; // target currency code
};
```

`rate` is a **string**, not a number. Using a number would introduce IEEE-754 errors into the bigint conversion arithmetic.

---

### `FormatOptions`

```ts
type FormatOptions = {
  locale?: string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  style?: 'code' | 'name' | 'narrowSymbol' | 'symbol';
};
```

---

### `MoneyFormatPart`

```ts
type MoneyFormatPart = {
  type: 'currency' | 'decimal' | 'fraction' | 'integer' | 'literal' | 'minusSign';
  value: string;
};
```

---

### `MoneyJSON`

```ts
type MoneyJSON = {
  amount: string; // bigint serialized as decimal integer string
  currency: string;
};
```

---

### `RoundingMode`

```ts
type RoundingMode = 'ceiling' | 'down' | 'floor' | 'half-away-from-zero' | 'half-even' | 'up';
```

## See Also

- [Usage Guide](./usage.md)
- [Examples](./examples.md)

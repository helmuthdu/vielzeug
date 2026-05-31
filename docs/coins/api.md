---
title: Coins — API Reference
description: Complete API reference for @vielzeug/coins.
---

[[toc]]

## API At a Glance

| Symbol | Purpose | Execution | Common gotcha |
| --- | --- | --- | --- |
| `toCurrencyCode()` | Validate and brand a currency code string | Sync | Throws `RangeError` for unrecognised ISO 4217 codes |
| `money()` | Create a `Money` value from decimal string / number / bigint | Sync | Number input is converted via `String()` — IEEE-754 limits apply |
| `add()` / `subtract()` | Add or subtract same-currency values | Sync | Throws `TypeError` on currency mismatch |
| `multiply()` | Scale a money value by a factor | Sync | Default rounding is `'half-away-from-zero'`; use string factors for lossless fractions |
| `divide()` | Divide a money value by a divisor | Sync | Throws `RangeError` on division by zero |
| `abs()` / `negate()` | Absolute value / sign flip | Sync | |
| `allocate()` | Distribute across weighted shares (LRM) | Sync | All ratios zero → `RangeError`; any negative ratio → `RangeError` |
| `splitEvenly()` | Distribute into equal shares | Sync | Sugar over `allocate`; non-positive `parts` → `RangeError` |
| `sum()` | Sum an array of money values | Sync | Empty array → `RangeError`; mixed currencies → `TypeError` |
| `min()` / `max()` | Smallest / largest value | Sync | Throws `TypeError` on currency mismatch |
| `compare()` | Three-way comparison | Sync | Throws `TypeError` on currency mismatch |
| `isEqual()` / `greaterThan()` etc. | Boolean comparisons | Sync | All throw `TypeError` on currency mismatch |
| `isZero()` / `isPositive()` / `isNegative()` | Sign predicates | Sync | |
| `format()` | Locale-aware currency string | Sync | Uses `Intl.NumberFormat`; `maximumFractionDigits < minimumFractionDigits` → `RangeError` |
| `formatParts()` | Typed part array for custom rendering | Sync | Joining all `value` fields equals `format()` output |
| `exchange()` | Convert between currencies | Sync | `rate` must be a decimal string; throws `TypeError` on currency mismatch |
| `toDecimal()` | Minor units → decimal string | Sync | Round-trips losslessly with `money()` |
| `toNumber()` | Minor units → float | Sync | Lossy — for display and charting only, never for arithmetic |
| `toJSON()` / `fromJSON()` | Serialize / deserialize through JSON | Sync | `amount` is a string in `MoneyJSON` because `bigint` is not JSON-serializable |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/coins` | All public exports and types |

---

## Factories

### `toCurrencyCode(code)`

```ts
function toCurrencyCode(code: string): CurrencyCode;
```

Validates an ISO 4217 currency code string against `Intl.NumberFormat` and returns it as a branded `CurrencyCode`. Throws `RangeError` for unrecognised codes. Results are cached — repeated calls with the same code are free.

```ts
const usd = toCurrencyCode('USD');  // CurrencyCode
toCurrencyCode('NOTREAL');          // throws RangeError: Invalid ISO 4217 currency code: "NOTREAL"
```

Use this when constructing an `ExchangeRate` or when processing a currency string from user input or an external API.

---

### `money(amount, currency)`

```ts
function money(amount: bigint | number | string, currency: string): Money;
```

Creates a `Money` value. The `currency` argument is validated (same check as `toCurrencyCode`). Throws `RangeError` for unrecognised currencies or invalid decimal strings.

| `amount` type | Behaviour |
|---|---|
| `string` `'1234.56'` | Parsed losslessly; extra digits rounded half-away-from-zero |
| `number` `1234.56` | Converted via `String()` — IEEE-754 limits apply; prefer strings |
| `bigint` `123456n` | Used as-is (already in minor units) |

```ts
money('1234.56', 'USD')  // { amount: 123456n, currency: 'USD' }
money(1234.56,   'USD')  // { amount: 123456n, currency: 'USD' }
money(123456n,   'USD')  // { amount: 123456n, currency: 'USD' }
money('1234',    'JPY')  // { amount: 1234n,   currency: 'JPY' }
money('1.234',   'KWD')  // { amount: 1234n,   currency: 'KWD' }
```

---

## Arithmetic

All binary arithmetic functions throw `TypeError` when the two `Money` values have different currencies.

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
multiply(money('100.00', 'USD'), '1.5')              // $150.00
multiply(money('1.00',   'USD'), '0.339', 'floor')   // $0.33
multiply(money('1.00',   'USD'), '0.339', 'ceiling') // $0.34
```

### `divide(money, divisor, mode?)`

```ts
function divide(m: Money, divisor: number | string, mode?: RoundingMode): Money;
```

Divides `m.amount` by `divisor`. Throws `RangeError` on division by zero.

```ts
divide(money('100.00', 'USD'), 3)             // $33.33
divide(money('100.00', 'USD'), 3, 'ceiling')  // $33.34
divide(money('100.00', 'USD'), 0)             // throws RangeError
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

---

## Allocation

### `allocate(money, ratios)`

```ts
function allocate(m: Money, ratios: readonly (number | string)[]): Money[];
```

Distributes `m` across `ratios` using the **Largest Remainder Method**. The sum of all returned values is always exactly equal to `m` — no minor unit is ever lost or gained.

Ratios are proportional — they do not need to sum to 1. Accepts number or string ratios; use strings for lossless decimal weights.

Throws `RangeError` if:
- `ratios` is empty
- any ratio is negative
- all ratios are zero

```ts
allocate(money('10.00', 'USD'), [1, 1, 1])
// [{ amount: 334n, ... }, { amount: 333n, ... }, { amount: 333n, ... }]

allocate(money('10.00', 'USD'), ['0.3', '0.7'])
// [{ amount: 300n, ... }, { amount: 700n, ... }]
```

### `splitEvenly(money, parts)`

```ts
function splitEvenly(m: Money, parts: number): Money[];
```

Splits `m` into `parts` equal shares. Equivalent to `allocate(m, Array(parts).fill(1))`. Throws `RangeError` if `parts` is not a positive integer.

---

## Aggregates

### `sum(moneys)`

```ts
function sum(moneys: readonly Money[]): Money;
```

Sums an array of `Money` values. Throws `RangeError` if empty. Throws `TypeError` on currency mismatch.

### `min(first, ...rest)`

```ts
function min(first: Money, ...rest: Money[]): Money;
```

Returns the smallest value. Throws `TypeError` on currency mismatch.

### `max(first, ...rest)`

```ts
function max(first: Money, ...rest: Money[]): Money;
```

Returns the largest value. Throws `TypeError` on currency mismatch.

---

## Comparison

All comparison functions throw `TypeError` when currencies differ.

### `compare(a, b)`

```ts
function compare(a: Money, b: Money): -1 | 0 | 1;
```

Returns `-1` if `a < b`, `0` if equal, `1` if `a > b`.

### `isEqual(a, b)`

```ts
function isEqual(a: Money, b: Money): boolean;
```

Returns `true` if both amount and currency are identical. Throws `TypeError` on currency mismatch (consistent with all other comparison functions).

### `greaterThan(a, b)` · `greaterThanOrEqual(a, b)` · `lessThan(a, b)` · `lessThanOrEqual(a, b)`

```ts
function greaterThan(a: Money, b: Money): boolean;
function greaterThanOrEqual(a: Money, b: Money): boolean;
function lessThan(a: Money, b: Money): boolean;
function lessThanOrEqual(a: Money, b: Money): boolean;
```

### `isZero(money)` · `isPositive(money)` · `isNegative(money)`

```ts
function isZero(m: Money): boolean;      // amount === 0n
function isPositive(m: Money): boolean;  // amount > 0n
function isNegative(m: Money): boolean;  // amount < 0n
```

---

## Serialization

### `toDecimal(money)`

```ts
function toDecimal(m: Money): string;
```

Converts minor units to a decimal string. Round-trips losslessly with `money()`.

```ts
toDecimal(money(123456n, 'USD'))  // '1234.56'
toDecimal(money(5n,      'USD'))  // '0.05'
toDecimal(money(1234n,   'JPY'))  // '1234'
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

Serializes/deserializes a `Money` value to/from a plain JSON-safe object. `amount` is a bigint string to survive `JSON.stringify`. `fromJSON` validates the currency code and throws `SyntaxError` for invalid amount strings.

```ts
toJSON(money('1234.56', 'USD'))
// { amount: '123456', currency: 'USD' }

fromJSON({ amount: '123456', currency: 'USD' })
// { amount: 123456n, currency: 'USD' }
```

---

## Formatting

### `format(money, options?)`

```ts
function format(m: Money, options?: FormatOptions): string;
```

Formats a `Money` value as a locale-aware currency string using bigint arithmetic. No floating-point precision loss for any amount.

#### `FormatOptions`

| Field | Type | Default | Description |
|---|---|---|---|
| `locale` | `string` | `'en-US'` | BCP 47 language tag |
| `style` | `'symbol' \| 'code' \| 'name'` | `'symbol'` | Currency display style |
| `minimumFractionDigits` | `number` | currency default | Minimum decimal places shown |
| `maximumFractionDigits` | `number` | currency default | Maximum decimal places shown |

Throws `RangeError` if `minimumFractionDigits > maximumFractionDigits` or if either is negative or non-integer.

```ts
format(money('1234.56', 'USD'))                  // '$1,234.56'
format(money('1234.56', 'USD'), { locale: 'de-DE' }) // '1.234,56 $'
format(money('1234.56', 'USD'), { style: 'code' })   // 'USD 1,234.56'
format(money('1234.56', 'USD'), { style: 'name' })   // '1,234.56 US dollars'
format(money('1234', 'JPY'))                         // '¥1,234'
```

---

### `formatParts(money, options?)`

```ts
function formatParts(m: Money, options?: FormatOptions): MoneyFormatPart[];
```

Same options as `format()`. Returns an array of typed part objects instead of a joined string. Useful for applying different styles to each semantic segment.

Joining all `value` fields always produces the same output as `format(m, options)`.

```ts
formatParts(money('1234.56', 'USD'))
// [
//   { type: 'currency', value: '$' },
//   { type: 'integer',  value: '1,234' },
//   { type: 'decimal',  value: '.' },
//   { type: 'fraction', value: '56' },
// ]

formatParts(money('-99.99', 'USD'))
// [
//   { type: 'minusSign', value: '-' },
//   { type: 'currency',  value: '$' },
//   { type: 'integer',   value: '99' },
//   { type: 'decimal',   value: '.' },
//   { type: 'fraction',  value: '99' },
// ]
```

---

## Currency Exchange

### `exchange(money, rate, mode?)`

```ts
function exchange(m: Money, rate: ExchangeRate, mode?: RoundingMode): Money;
```

Converts `m` to the currency specified in `rate.to` using lossless bigint arithmetic. The `rate.rate` field must be a decimal string.

Throws `TypeError` if `m.currency !== rate.from`. Accepts an optional `RoundingMode` (default `'half-away-from-zero'`).

```ts
const usd = toCurrencyCode('USD');
const eur = toCurrencyCode('EUR');

exchange(
  money('100.00', 'USD'),
  { from: usd, rate: '0.92', to: eur },
);
// { amount: 9200n, currency: 'EUR' }

exchange(
  money('100.00', 'USD'),
  { from: usd, rate: '0.92', to: eur },
  'floor',
);
// { amount: 9200n, currency: 'EUR' }  (same here — exact result)
```

---

## Rounding Modes

Used by `multiply`, `divide`, and `exchange` when the result contains a fractional minor unit.

| Mode | Description |
|---|---|
| `'half-away-from-zero'` | Round half away from zero **(default)** |
| `'half-even'` | Banker's rounding — nearest even integer at halves |
| `'down'` | Truncate toward zero |
| `'up'` | Away from zero |
| `'floor'` | Toward −∞ |
| `'ceiling'` | Toward +∞ |

---

## Types

### `CurrencyCode`

```ts
type CurrencyCode = string & { readonly [brand]: true };
```

A validated, branded string. Obtain via `toCurrencyCode()`. The brand prevents passing an unvalidated plain string where a `CurrencyCode` is required (e.g. `ExchangeRate.from`/`to`).

---

### `Money`

```ts
type Money = {
  readonly amount:   bigint;       // minor units (cents for USD, whole units for JPY)
  readonly currency: CurrencyCode;
};
```

---

### `ExchangeRate`

```ts
type ExchangeRate = {
  readonly from: CurrencyCode;  // source currency
  readonly rate: string;        // decimal multiplier string, e.g. '0.92'
  readonly to:   CurrencyCode;  // target currency
};
```

`rate` is a **string**, not a number. Using a number would introduce IEEE-754 errors into the bigint conversion arithmetic.

---

### `FormatOptions`

```ts
type FormatOptions = {
  locale?:                string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  style?:                 'code' | 'name' | 'symbol';
};
```

---

### `MoneyFormatPart`

```ts
type MoneyFormatPart = {
  type:  'currency' | 'decimal' | 'fraction' | 'integer' | 'literal' | 'minusSign';
  value: string;
};
```

---

### `MoneyJSON`

```ts
type MoneyJSON = {
  amount:   string;  // bigint serialized as decimal integer string
  currency: string;
};
```

---

### `RoundingMode`

```ts
type RoundingMode = 'ceiling' | 'down' | 'floor' | 'half-away-from-zero' | 'half-even' | 'up';
```

---

## See Also

- [Usage Guide](./usage.md)
- [Examples](./examples.md)

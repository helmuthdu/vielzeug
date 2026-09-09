---
title: Coins — API Reference
description: Exact money, currency definitions, exchange, formatting, serialization, and errors.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution | Common gotcha |
| --- | --- | --- | --- |
| `money` | Construct validated money | Sync | Bigint requires `{ unit: 'minor' }` |
| `currency` | Resolve built-in or construct custom | Sync | Unknown codes throw |
| `add` / `subtract` | Combine matching currencies | Sync | Mismatches throw |
| `multiply` / `divide` | Exact decimal scaling | Sync | Use decimal strings |
| `sum` | Aggregate with inferred currency | Sync | Empty iterable requires `{ currency }` |
| `allocate` | Split without losing minor units | Sync | Weights must be non-negative |
| `clamp` | Bound to min/max range | Sync | Min must not exceed max |
| `exchange` | Convert through an exact rate | Sync | Rate source must match value currency |
| `format` | Present money with `Intl` | Sync | Formatting does not define currency scale |
| `toJSON` / `decodeMoney` | Cross serialization or realm boundary | Sync | Persisted amount uses minor units |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/coins` | Complete public Coins API |

## Construction

### `currency(code)` / `currency({ code, minorUnit })`

```ts
function currency<C extends string>(code: C): Currency<C>;
function currency<C extends string>(definition: { code: C; minorUnit: number }): Currency<C>;
```

Resolves one of the seven built-ins—`USD`, `EUR`, `GBP`, `JPY`, `KRW`, `BHD`, or `KWD`—or constructs an immutable custom currency. Custom currencies are local values with no global registry. Code must be exactly three uppercase letters; `minorUnit` must be an integer from 0 to 6. Arithmetic compares currency definitions by reference.

```ts
currency('USD');
currency({ code: 'PTS', minorUnit: 0 });
```

### `isCurrency(value)`

```ts
function isCurrency(value: unknown): value is Currency;
```

Type guard for canonical currency values (built-in or constructed via `currency()`).

### `money(amount, currency, options?)`

```ts
function money<C extends Currency>(amount: string, currency: C, options?: { rounding?: RoundingMode }): Money<C>;
function money<C extends Currency>(amount: bigint, currency: C, options: { unit: 'minor' }): Money<C>;
```

```ts
money('19.99', USD);
money(1999n, USD, { unit: 'minor' });
```

Decimal strings that exceed the currency's precision require a `rounding` mode. Inputs use plain base-10 syntax without exponent, leading plus, or whitespace; input length is capped at 1,000 characters and normalized fractional precision at 100 places. Bigint amounts require `{ unit: 'minor' }`.

### `decodeMoney(value, options?)`

```ts
function decodeMoney(value: unknown, options?: { currency?: (code: string) => Currency }): Money;
```

Validates untrusted or cross-realm data and returns canonical money. Plain bigint input must have exactly `amount` and canonical `currency`; JSON must have exactly `amount`, currency code, and `unit: 'minor'`. Serialized amounts are bounded to 1,000 characters. A custom resolver must return a canonical currency whose code matches the envelope.

### `isMoney(value)`

```ts
function isMoney(value: unknown): value is Money;
```

Type guard for canonical Coins money values. Checks identity against the internal canonical set — forged frozen objects do not pass.

## Arithmetic

```ts
function add<C extends Currency>(left: Money<C>, right: Money<NoInfer<C>>): Money<C>;
function subtract<C extends Currency>(left: Money<C>, right: Money<NoInfer<C>>): Money<C>;
function multiply<C extends Currency>(value: Money<C>, factor: string, options?: { rounding?: RoundingMode }): Money<C>;
function divide<C extends Currency>(value: Money<C>, divisor: string, options?: { rounding?: RoundingMode }): Money<C>;
function compare<C extends Currency>(left: Money<C>, right: Money<NoInfer<C>>): -1 | 0 | 1;
function clamp<C extends Currency>(
  value: Money<C>,
  options: { max: Money<NoInfer<C>>; min: Money<NoInfer<C>> },
): Money<C>;
function abs<C extends Currency>(value: Money<C>): Money<C>;
function negate<C extends Currency>(value: Money<C>): Money<C>;
function round<C extends Currency>(
  value: Money<C>,
  options: { fractionDigits: number; rounding?: RoundingMode },
): Money<C>;
function toDecimal(value: Money): string;
```

`factor` and `divisor` are plain decimal strings; exponent notation, whitespace, and a leading plus are invalid. Matching currency identity is required for binary operations. `round()` requires integer `fractionDigits` from 0 through the currency's `minorUnit`. Scaling and rounding default to `halfAwayFromZero`.

## Aggregation

```ts
function sum<C extends Currency>(values: readonly Money<C>[]): Money<C>;
function sum<C extends Currency>(values: Iterable<Money<C>>, options: { currency: C }): Money<C>;
function allocate<C extends Currency>(value: Money<C>, count: number): Money<C>[];
function allocate<C extends Currency>(value: Money<C>, weights: readonly string[]): Money<C>[];
```

`sum()` infers currency from non-empty values. An empty iterable requires a canonical `{ currency }` and returns canonical zero. `allocate()` accepts a positive integer count or dense, non-empty, non-negative decimal-string weights with a positive total. Either form is limited to 100,000 output parts. It distributes remainders by largest fractional share, breaks ties by input order, and preserves the exact signed minor-unit total.

## Exchange

```ts
function exchangeRate<From extends Currency, To extends Currency>({
  from,
  to,
  value,
}: {
  from: From;
  to: To;
  value: string;
}): ExchangeRate<From, To>;

function exchange<From extends Currency, To extends Currency>(
  value: Money<From>,
  rate: ExchangeRate<From, To>,
  options?: { rounding?: RoundingMode },
): Money<To>;
```

```ts
const rate = exchangeRate({ from: USD, to: EUR, value: '0.9234' });
exchange(money('100.00', USD), rate);
```

Rates are exact positive decimal strings. The money currency must be the same canonical instance as `rate.from`. Conversion defaults to `halfAwayFromZero` rounding.

### `isExchangeRate(value)`

```ts
function isExchangeRate(value: unknown): value is ExchangeRate;
```

Type guard for canonical exchange rates created by `exchangeRate()`. Checks identity against the internal canonical set — forged frozen objects do not pass.

## Formatting

```ts
function format(value: Money, options?: FormatOptions): string;
function formatParts(value: Money, options?: FormatOptions): MoneyFormatPart[];
```

Defaults are locale `en-US`, style `symbol`, and the currency's minor-unit digits. Either fraction bound may be supplied independently; the omitted bound adjusts to remain compatible. Explicit bounds must satisfy `0 ≤ minimum ≤ maximum ≤ 20`. Exact decimal strings and mapped rounding modes are passed to `Intl.NumberFormat`, preserving locale digits, currency-name pluralization, and rounded negative signs. `formatParts()` keeps locale grouping inside its `integer` part.

## Serialization

```ts
function toJSON(value: Money): MoneyJSON;
function decodeMoney(value: unknown, options?: { currency?: (code: string) => Currency }): Money;
```

`toJSON()` produces exactly `{ amount, currency, unit: 'minor' }`. `amount` is a canonical integer string of at most 1,000 characters: no decimal point, exponent, leading plus, leading zero, whitespace, or negative zero. `decodeMoney()` resolves built-ins with `currency()` by default; custom codes require a resolver returning the same encoded code.

## Types

```ts
type CurrencyCode<C extends string = string> = C & { readonly [currencyBrand]: C };

type Currency<C extends string = string> = Readonly<{
  code: CurrencyCode<C>;
  minorUnit: number;
}>;

type Decimal = Readonly<{
  readonly [decimalBrand]: true;
  denominator: bigint;
  numerator: bigint;
}>;

type Money<C extends Currency = Currency> = Readonly<{
  amount: bigint;
  currency: C;
  readonly [moneyBrand]: C;
}>;

type ExchangeRate<From extends Currency = Currency, To extends Currency = Currency> = Readonly<{
  from: From;
  to: To;
  value: Decimal;
}>;

type FormatOptions = Readonly<{
  locale?: string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  rounding?: RoundingMode;
  style?: 'code' | 'name' | 'narrowSymbol' | 'symbol';
}>;

type MoneyFormatPart = Readonly<{
  type: 'currency' | 'decimal' | 'fraction' | 'integer' | 'literal' | 'minusSign' | 'plusSign';
  value: string;
}>;

type MoneyJSON = Readonly<{
  amount: string;
  currency: string;
  unit: 'minor';
}>;

type RoundingMode = 'awayFromZero' | 'ceil' | 'floor' | 'halfAwayFromZero' | 'halfEven' | 'towardZero';
```

`CurrencyCode`, `Decimal`, and `Money` carry phantom brand symbols that prevent unbranded values from being assigned where canonical values are required. `ExchangeRate.value` exposes a normalized exact `Decimal` numerator and denominator.

| Rounding mode | Behavior |
| --- | --- |
| `awayFromZero` | Always increase a non-exact magnitude |
| `ceil` | Toward positive infinity |
| `floor` | Toward negative infinity |
| `halfAwayFromZero` | Nearest; midpoint away from zero |
| `halfEven` | Nearest; midpoint to an even retained unit |
| `towardZero` | Truncate toward zero |

## Errors

```ts
type CoinsErrorCode =
  | 'CURRENCY_MISMATCH'
  | 'DIVISION_BY_ZERO'
  | 'FORMAT_ERROR'
  | 'INVALID_ALLOCATION'
  | 'INVALID_CURRENCY'
  | 'INVALID_DECIMAL'
  | 'INVALID_EXCHANGE_RATE'
  | 'INVALID_MONEY'
  | 'INVALID_RANGE'
  | 'INVALID_ROUNDING';
```

Every Coins failure extends `CoinsError` and exposes `code`.

```ts
class CoinsError extends Error {
  readonly code: CoinsErrorCode;
}

class CurrencyMismatchError extends CoinsError {
  readonly expected: string;
  readonly received: string;
}

class InvalidCurrencyError extends CoinsError {
  readonly value: unknown;
}
```

`CurrencyMismatchError` and `InvalidCurrencyError` are specialized `CoinsError` subclasses. Use `instanceof CoinsError` to narrow any value to the Coins error hierarchy.

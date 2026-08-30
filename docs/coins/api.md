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
| `toJSON` / `parseMoneyJSON` | Cross JSON boundary | Sync | Persisted amount uses minor units |

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

Resolves a built-in currency by ISO code, or constructs an immutable custom currency from a definition. Built-in definitions: `USD`, `EUR`, `GBP`, `JPY`, `KRW`, `BHD`, `KWD`. Custom currencies are local values — no global registry. Code must be three uppercase letters; `minorUnit` must be an integer from 0 to 6.

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

Decimal strings that exceed the currency's precision require a `rounding` mode. Bigint amounts require `{ unit: 'minor' }`.

### `parseMoney(value)`

```ts
function parseMoney(value: unknown): Money;
```

Validates a plain data object and returns canonical money. Requires a bigint `amount` and a canonical currency. Use for untrusted input; use `isMoney()` for trusted values.

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

`factor` and `divisor` are decimal strings. Matching currency is required for binary money operations. `round`'s `fractionDigits` must be an integer from 0 to the currency's `minorUnit`.

## Aggregation

```ts
function sum<C extends Currency>(values: readonly Money<C>[]): Money<C>;
function sum<C extends Currency>(values: Iterable<Money<C>>, options: { currency: C }): Money<C>;
function allocate<C extends Currency>(value: Money<C>, count: number): Money<C>[];
function allocate<C extends Currency>(value: Money<C>, weights: readonly string[]): Money<C>[];
```

`sum` infers currency from non-empty values. `sum([], { currency: USD })` returns zero USD. `allocate` returns values whose minor-unit total exactly equals input.

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

`FormatOptions` uses `locale`, `style`, `rounding`, `minimumFractionDigits`, and `maximumFractionDigits`.

## Serialization

```ts
function toJSON(value: Money): MoneyJSON;
function parseMoneyJSON(value: unknown, options?: { currency?: (code: string) => Currency }): Money;
```

`toJSON` produces a `{ amount, currency, unit: 'minor' }` shape. `parseMoneyJSON` validates the shape, unit, and currency code; custom currencies require an explicit `currency` resolver.

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

`CurrencyCode`, `Decimal`, and `Money` carry phantom brand symbols that prevent unbranded values from being assigned where a canonical value is required.

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

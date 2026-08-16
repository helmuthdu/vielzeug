---
title: Coins — API Reference
description: Exact money, currency definitions, exchange, formatting, serialization, and errors.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution | Common gotcha |
| --- | --- | --- | --- |
| `money` | Construct validated money | Sync | Bigint requires `{ unit: 'minor' }` |
| `currency` | Resolve supported definition | Sync | Unknown codes throw |
| `defineCurrency` | Define an explicit scale | Sync | Code must be three uppercase letters |
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

### currency / defineCurrency

```ts
currency(code: string): Currency
defineCurrency({ code, minorUnit }): Currency
```

Built-ins: `USD`, `EUR`, `GBP`, `JPY`, `KRW`, `BHD`, `KWD`.

### money

```ts
money(amount: string, currency: Currency): Money
money(amount: string, currency: Currency, options: { rounding: RoundingMode }): Money
money(amount: bigint, currency: Currency, options: { unit: 'minor' }): Money
```

```ts
money('19.99', USD);
money(1999n, USD, { unit: 'minor' });
```

## Arithmetic

```ts
add(left, right)
subtract(left, right)
multiply(value, factor, { rounding? })
divide(value, divisor, { rounding? })
compare(left, right)
clamp(value, { min, max })
abs(value)
negate(value)
round(value, { fractionDigits, rounding? })
```

`factor` and `divisor` are decimal strings. Matching currency is required for binary money operations.

## Aggregation

```ts
sum(values)
sum(values, { currency })
allocate(value, count)
allocate(value, weights)
```

`sum` infers currency from non-empty values. `sum([], { currency: USD })` returns zero USD. `allocate` returns values whose minor-unit total exactly equals input.

## Exchange

```ts
exchangeRate({ from, to, value }): ExchangeRate
exchange(value, rate, { rounding? }): Money
```

```ts
const rate = exchangeRate({ from: USD, to: EUR, value: '0.9234' });
exchange(money('100.00', USD), rate);
```

## Formatting

```ts
format(value, options?): string
formatParts(value, options?): MoneyFormatPart[]
```

`FormatOptions` uses `locale`, `style`, `rounding`, `minimumFractionDigits`, and `maximumFractionDigits`.

## Serialization

```ts
toDecimal(value): string
toJSON(value): MoneyJSON
parseMoneyJSON(value: unknown, options?: { currency?: (code: string) => Currency }): Money
parseMoney(value: unknown): Money
isMoney(value: unknown): value is Money
```

## Types

```ts
type Currency = { code: CurrencyCode; minorUnit: number };
type Money = { amount: bigint; currency: Currency };
type Decimal = { numerator: bigint; denominator: bigint };
type ExchangeRate = { from: Currency; to: Currency; value: Decimal };
type MoneyJSON = { amount: string; currency: string; unit: 'minor' };
type RoundingMode = 'awayFromZero' | 'ceil' | 'floor' | 'halfAwayFromZero' | 'halfEven' | 'towardZero';
```

## Errors

Every Coins failure extends `CoinsError` and exposes `code`.

- `INVALID_CURRENCY`
- `INVALID_DECIMAL`
- `INVALID_MONEY`
- `INVALID_ALLOCATION`
- `INVALID_ROUNDING`
- `FORMAT_ERROR`
- `DIVISION_BY_ZERO`
- `CURRENCY_MISMATCH`

`CurrencyMismatchError` and `InvalidCurrencyError` are specialized `CoinsError` subclasses.

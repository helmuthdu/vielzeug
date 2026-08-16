---
title: Coins 2.1 Migration
---

# Coins 2.1 Migration

Coins 2.1 simplifies the public API: `decimal` is internal, `sum` infers currency, format errors use `FORMAT_ERROR`, and `format` accepts a `rounding` option.

## `decimal` removed from public API

`decimal()` is now internal. `Decimal` type remains exported for `ExchangeRate.value` inspection. Pass decimal strings to `money`, `multiply`, `divide`, `exchangeRate`, and `allocate`.

```ts
// Before
import { decimal } from '@vielzeug/coins';
const d = decimal('1.075');

// After — no public equivalent; use string inputs directly
multiply(money('10.00', USD), '1.075');
```

## `sum` infers currency

`sum` no longer requires `{ currency }` for non-empty collections. Pass `{ currency }` only for possibly empty iterables.

```ts
// Before
sum([money('1', USD), money('2', USD)], { currency: USD });

// After
sum([money('1', USD), money('2', USD)]);
sum([], { currency: USD }); // still required for empty
```

## `CoinsError.is()` removed

Use `instanceof CoinsError`.

```ts
// Before
if (CoinsError.is(error)) { ... }

// After
if (error instanceof CoinsError) { ... }
```

## `FORMAT_ERROR` code

Format failures (invalid locale, invalid fraction digits) now throw `FORMAT_ERROR` instead of `INVALID_ROUNDING` or `INVALID_CURRENCY`.

```ts
// Before
catch (error) {
  if (error.code === 'INVALID_ROUNDING') { ... }
}

// After
catch (error) {
  if (error.code === 'FORMAT_ERROR') { ... }
}
```

## `clamp` error code

`clamp` min-exceeds-max now throws `INVALID_MONEY` instead of `INVALID_ALLOCATION`.

## `format` rounding option

`format` accepts a `rounding` option for visible digit rounding, defaulting to `halfAwayFromZero`.

```ts
format(money('2.05', USD), { maximumFractionDigits: 1, minimumFractionDigits: 1, rounding: 'halfEven' });
// '$2.0'
```

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current contracts.

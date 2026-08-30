---
title: Coins 2.2 Migration
---

# Coins 2.2 Migration

Coins 2.2 removes the global custom currency registry, consolidates construction, and strengthens canonical identity checks. Breaking changes below.

## `defineCurrency` removed — use `currency({ code, minorUnit })`

Custom currencies are now local immutable values, not process-global registrations. No hidden mutation, no test leakage, no duplicate-scale conflicts across independent definitions.

```ts
// Before
import { defineCurrency } from '@vielzeug/coins';
const POINTS = defineCurrency({ code: 'PTS', minorUnit: 0 });

// After
import { currency } from '@vielzeug/coins';
const POINTS = currency({ code: 'PTS', minorUnit: 0 });
```

`currency(code)` still resolves built-ins. Two calls with the same definition produce distinct but equivalent currencies — no global identity.

### Custom currencies must be shared

Currency equality is reference-based. Two independently created custom currencies with the same code and scale are **not interchangeable** — `add()`, `sum()`, `subtract()`, `compare()`, `clamp()`, and `exchange()` will throw `CurrencyMismatchError` when mixing values created with different instances.

```ts
// Wrong — two distinct PTS instances
const ptsA = currency({ code: 'PTS', minorUnit: 0 });
const ptsB = currency({ code: 'PTS', minorUnit: 0 });
add(money('1', ptsA), money('1', ptsB)); // throws CurrencyMismatchError

// Right — single source of truth
// currencies.ts
export const PTS = currency({ code: 'PTS', minorUnit: 0 });
```

### Realm boundary limitation

Canonical identity checks (`isMoney`, `isCurrency`, `isExchangeRate`) use an internal `WeakSet` tied to object identity. Values that cross realm boundaries via `structuredClone()`, `postMessage()`, or worker transfer lose canonical status. Re-canonicalize with `parseMoney()` / `parseMoneyJSON()` on the receiving side.

## `withMinor` removed — use `money(amount, currency, { unit: 'minor' })`

One constructor for all money values. BigInt minor-unit construction stays explicit via the `{ unit: 'minor' }` option.

```ts
// Before
import { withMinor } from '@vielzeug/coins';
const price = withMinor(1999n, USD);

// After
import { money } from '@vielzeug/coins';
const price = money(1999n, USD, { unit: 'minor' });
```

## `resolveBuiltinCurrency` removed — use `currency`

`parseMoneyJSON` now defaults to `currency` for resolution. Custom currencies still require an explicit resolver.

```ts
// Before
import { resolveBuiltinCurrency } from '@vielzeug/coins';
parseMoneyJSON(payload, { currency: resolveBuiltinCurrency });

// After — default resolver is `currency`
parseMoneyJSON(payload);
parseMoneyJSON(payload, { currency: (code) => (code === 'TOK' ? tokens : currency(code)) });
```

## `isMoney` now identity-based

`isMoney` checks membership in the internal canonical set, not structural shape. Forged frozen objects with `bigint` amount and registered currency no longer pass. Use `parseMoney` to validate and canonicalize untrusted plain data.

```ts
// Before — structural check accepted forged frozen objects
isMoney(Object.freeze({ amount: 1n, currency: USD })); // true

// After — identity check rejects forgeries
isMoney(Object.freeze({ amount: 1n, currency: USD })); // false
isMoney(money('1', USD)); // true
```

## `isExchangeRate` added

New type guard for canonical exchange rates. Same identity-based semantics as `isMoney`.

```ts
import { exchangeRate, isExchangeRate } from '@vielzeug/coins';
const rate = exchangeRate({ from: USD, to: EUR, value: '0.9234' });
isExchangeRate(rate); // true
isExchangeRate(Object.freeze({ ...rate })); // false
```

## `clamp` error code changed to `INVALID_RANGE`

Was `INVALID_MONEY`. The value isn't invalid — the bounds relationship is.

```ts
// Before
catch (error) {
  if (error.code === 'INVALID_MONEY') { ... }
}

// After
catch (error) {
  if (error.code === 'INVALID_RANGE') { ... }
}
```

## `exchange` error code for non-canonical rates

Non-canonical exchange rates now throw `INVALID_EXCHANGE_RATE` instead of `INVALID_MONEY`.

---

Previous: `decimal` internalized, `sum` infers currency, `FORMAT_ERROR` code, `format` rounding option (Coins 2.1).

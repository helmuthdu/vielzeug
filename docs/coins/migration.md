---
title: Coins Migration
---

# Coins Migration

## Coins 3.0

Coins 3.0 consolidates trust-boundary decoding and hardens runtime exactness, canonical currency invariants, allocation, exchange rates, and locale formatting. `USD`, `EUR`, `GBP`, `JPY`, `KRW`, `BHD`, and `KWD` remain canonical built-ins. The public `Decimal` type remains available because `ExchangeRate.value` exposes it.

### Use `decodeMoney()` at every trust boundary

`parseMoney()` and `parseMoneyJSON()` are replaced by one strict decoder. The two accepted shapes are disjoint and exact:

```ts
// Before
const trustedShape = parseMoney(value);
const persisted = parseMoneyJSON(payload);

// After
const trustedShape = decodeMoney({ amount: 100n, currency: USD });
const persisted = decodeMoney({ amount: '100', currency: 'USD', unit: 'minor' });
```

Plain bigint data must contain exactly `amount` and `currency`. `MoneyJSON` must contain exactly `amount`, `currency`, and `unit`. Serialized integer input is bounded to 1,000 characters.

Custom JSON currencies require a resolver that returns a canonical definition with the same code:

```ts
const TOK = currency({ code: 'TOK', minorUnit: 2 });
const restored = decodeMoney(payload, {
  currency: (code) => (code === 'TOK' ? TOK : currency(code)),
});
```

### Runtime exactness is enforced

Decimal APIs reject runtime numbers instead of relying only on TypeScript. Rounding modes are validated even when an operation divides exactly. Exchange rates must be greater than zero.

### Formatting follows `Intl`

Formatting now delegates exact decimal strings and mapped rounding modes to `Intl.NumberFormat`. This localizes integer and fractional digits, preserves rounded negative signs, selects currency names using the final visible value, and lets either fraction bound be supplied independently.

### Allocation input is bounded

Count and weighted allocation reject sparse arrays and more than 100,000 output parts. Empty sums validate their explicit currency before constructing canonical zero.

---

## Coins 2.2

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

`currency(code)` still resolves built-ins. Two calls with the same definition produce distinct canonical instances that are not interchangeable — no global custom registry exists.

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

Canonical identity checks (`isMoney`, `isCurrency`, `isExchangeRate`) use an internal `WeakSet` tied to object identity. Values that cross realm boundaries via `structuredClone()`, `postMessage()`, or worker transfer lose canonical status. In current code, re-canonicalize with `decodeMoney()` on the receiving side.

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

In Coins 2.2, `parseMoneyJSON` defaulted to `currency` for resolution. Coins 3.0 replaces it with `decodeMoney()`. Custom currencies still require an explicit resolver.

```ts
// Before
import { resolveBuiltinCurrency } from '@vielzeug/coins';
parseMoneyJSON(payload, { currency: resolveBuiltinCurrency });

// Coins 2.2 — default resolver is `currency`
parseMoneyJSON(payload);
parseMoneyJSON(payload, { currency: (code) => (code === 'TOK' ? tokens : currency(code)) });
```

## `isMoney` now identity-based

`isMoney` checks membership in the internal canonical set, not structural shape. Forged frozen objects with `bigint` amount and registered currency no longer pass. Use current `decodeMoney()` to validate and canonicalize untrusted plain data.

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

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current contracts.

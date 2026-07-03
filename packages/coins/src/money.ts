import type { Money, MoneyJSON, RoundingMode } from './types';

import { warn } from './_dev';
import { CoinsError, CurrencyMismatchError } from './errors';
import { applyRounding, getCurrencyDecimals, parseRational, pow10, validateCurrencyCode } from './utils';

export { CoinsError, CurrencyMismatchError, InvalidCurrencyError } from './errors';

// ─── Factories ───────────────────────────────────────────────────────────────

/**
 * Creates a `Money` value from a decimal string, number, or raw bigint minor units.
 * Validates the currency code — throws `InvalidCurrencyError` for unrecognised ISO 4217 codes.
 *
 * - **string** `'1234.56'` → parsed losslessly; respects the currency's decimal places.
 * - **number** `1234.56` → converted via `String()` first; inherits IEEE-754 limits.
 *   Prefer strings when precision matters.
 * - **bigint** `123456n` → used as-is (already in minor units).
 *
 * @example
 * ```ts
 * money('1234.56', 'USD') // { amount: 123456n, currency: 'USD' }
 * money(1234,      'JPY') // { amount: 1234n,   currency: 'JPY' }
 * money(123456n,   'USD') // { amount: 123456n, currency: 'USD' }
 * ```
 */
export function money(amount: bigint | number | string, currency: string): Money {
  const validCurrency = validateCurrencyCode(currency);

  if (typeof amount === 'bigint') {
    return { amount, currency: validCurrency };
  }

  if (typeof amount === 'number') {
    const decimals = getCurrencyDecimals(validCurrency);
    const str = String(amount);
    const dotIndex = str.indexOf('.');
    const fracLen = dotIndex === -1 ? 0 : str.length - dotIndex - 1;

    if (fracLen > decimals) {
      warn(
        `money(): number input "${amount}" has more decimal places (${fracLen}) than ${validCurrency} supports (${decimals}). ` +
          `Use a decimal string to avoid IEEE-754 precision loss.`,
      );
    }

    // getCurrencyDecimals is cached from the validateCurrencyCode call above.
    return { amount: parseToMinorUnits(str, decimals), currency: validCurrency };
  }

  // getCurrencyDecimals is cached from the validateCurrencyCode call above.
  return { amount: parseToMinorUnits(String(amount), getCurrencyDecimals(validCurrency)), currency: validCurrency };
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError(a.currency, b.currency);
  }
}

/**
 * Converts a decimal string to minor units for the given decimal precision.
 * Uses parseRational + applyRounding to share the single rounding implementation.
 */
function parseToMinorUnits(str: string, decimals: number): bigint {
  const { denominator, negative, numerator } = parseRational(str);
  // numerator/denominator × 10^decimals = numerator × 10^decimals / denominator
  const scale = pow10(decimals);
  const raw = numerator * scale;
  const quotient = raw / denominator;
  const result = applyRounding(quotient, raw % denominator, denominator, 'half-away-from-zero');

  return negative ? -result : result;
}

/**
 * Creates a new `Money` value with the given `amount` and the same currency as `m`.
 * Useful when you compute a raw `bigint` amount externally and need to wrap it
 * back into a `Money` value without re-validating the currency.
 *
 * @example
 * ```ts
 * const price = money('9.99', 'USD');
 * withAmount(price, 1999n)  // { amount: 1999n, currency: 'USD' }
 * ```
 */
export function withAmount(m: Money, amount: bigint): Money {
  return { amount, currency: m.currency };
}

/**
 * Type guard that returns `true` if `value` is a `Money`-shaped object
 * (has a `bigint` `amount` and a `string` `currency`).
 * Useful for narrowing unknown payloads from APIs or deserialized storage.
 *
 * Note: does **not** validate the currency code — use `money(0n, currency)` or
 * `validateCurrencyCode()` if you also need to confirm it is a recognized ISO 4217 code.
 *
 * @example
 * ```ts
 * isMoney({ amount: 100n, currency: 'USD' })  // true
 * isMoney({ amount: 1.5, currency: 'USD' })   // false
 * isMoney(null)                               // false
 * ```
 */
export function isMoney(value: unknown): value is Money {
  if (typeof value !== 'object' || value === null) return false;

  const v = value as Record<string, unknown>;

  return (
    Object.hasOwn(v, 'amount') &&
    typeof v.amount === 'bigint' &&
    Object.hasOwn(v, 'currency') &&
    typeof v.currency === 'string'
  );
}

// ─── Arithmetic ──────────────────────────────────────────────────────────────

/** Adds two `Money` values. Throws if their currencies differ. */
export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);

  return { amount: a.amount + b.amount, currency: a.currency };
}

/** Subtracts `b` from `a`. Throws if their currencies differ. */
export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);

  return { amount: a.amount - b.amount, currency: a.currency };
}

/**
 * Multiplies a `Money` value by a scalar factor.
 * The factor can be a decimal string (lossless) or a number.
 *
 * @param mode Rounding mode for fractional minor units. Defaults to `'half-away-from-zero'`.
 *
 * @example
 * ```ts
 * multiply(money('100.00', 'USD'), '1.5')              // $150.00
 * multiply(money('1.00', 'USD'), '0.339', 'floor')     // $0.33
 * multiply(money('1.00', 'USD'), '0.339', 'ceiling')   // $0.34
 * ```
 */
export function multiply(m: Money, factor: number | string, mode: RoundingMode = 'half-away-from-zero'): Money {
  const { denominator, negative: factorNegative, numerator } = parseRational(String(factor));
  const negative = m.amount < 0n !== factorNegative;
  const absAmount = m.amount < 0n ? -m.amount : m.amount;
  const raw = absAmount * numerator;
  const quotient = raw / denominator;
  const result = applyRounding(quotient, raw % denominator, denominator, mode, negative);

  return { amount: negative ? -result : result, currency: m.currency };
}

/**
 * Divides a `Money` value by a scalar divisor.
 * The divisor can be a decimal string (lossless) or a number.
 * Throws `RangeError` on division by zero.
 *
 * @param mode Rounding mode for fractional minor units. Defaults to `'half-away-from-zero'`.
 *
 * @example
 * ```ts
 * divide(money('100.00', 'USD'), 3)              // $33.33
 * divide(money('100.00', 'USD'), 3, 'ceiling')   // $33.34
 * ```
 */
export function divide(m: Money, divisor: number | string, mode: RoundingMode = 'half-away-from-zero'): Money {
  const { denominator: parsedDenom, negative: divisorNegative, numerator } = parseRational(String(divisor));

  if (numerator === 0n) throw new CoinsError('Division by zero');

  const negative = m.amount < 0n !== divisorNegative;
  const absAmount = m.amount < 0n ? -m.amount : m.amount;
  // Dividing by (numerator/parsedDenom) = multiplying by (parsedDenom/numerator).
  const raw = absAmount * parsedDenom;
  const quotient = raw / numerator;
  const result = applyRounding(quotient, raw % numerator, numerator, mode, negative);

  return { amount: negative ? -result : result, currency: m.currency };
}

/**
 * Distributes `money` across `ratios` without losing or gaining a single minor unit.
 * Accepts both number and string ratios — use strings for lossless decimal weights.
 *
 * Uses the Largest Remainder Method: each share gets its floor allocation first,
 * then any remainder units are assigned one-by-one to the shares with the largest
 * fractional parts, breaking ties by original index (stable, left-to-right).
 *
 * Throws if `ratios` is empty, contains negative values (including negative strings like `'-0.5'`), or sums to zero.
 *
 * @example
 * ```ts
 * allocate(money('10.00', 'USD'), [1, 1, 1])
 * // → [$3.34, $3.33, $3.33]   (not three × $3.33 — that loses a penny)
 *
 * allocate(money('10.00', 'USD'), ['0.3', '0.7'])
 * // → [$3.00, $7.00]
 * ```
 */
export function allocate(m: Money, ratios: readonly (number | string)[]): [Money, ...Money[]] {
  if (ratios.length === 0) throw new CoinsError('allocate requires at least one ratio');

  const parsedRatios = ratios.map((r) => parseRational(String(r)));

  if (parsedRatios.some((p) => p.negative)) throw new CoinsError('All ratios must be non-negative');

  if (!parsedRatios.some((p) => p.numerator > 0n)) throw new CoinsError('At least one ratio must be positive');

  const negative = m.amount < 0n;
  const absAmount = negative ? -m.amount : m.amount;

  // All denominators are powers of 10; the max is their LCM — use it to normalise weights to integers.
  const maxDenominator = parsedRatios.reduce((max, p) => (p.denominator > max ? p.denominator : max), 1n);
  const bigWeights = parsedRatios.map((p) => p.numerator * (maxDenominator / p.denominator));
  const bigTotal = bigWeights.reduce((a, b) => a + b, 0n);

  // Floor allocation + fractional remainders.
  const floors: bigint[] = [];
  const fracRemainders: bigint[] = [];

  for (const w of bigWeights) {
    const ideal = absAmount * w;

    floors.push(ideal / bigTotal);
    fracRemainders.push(ideal % bigTotal);
  }

  // Distribute leftover units to the shares with the largest fractional remainders.
  // Relies on V8/SpiderMonkey's stable sort (ECMAScript 2019+ spec-mandated): ties
  // in fractional remainders are broken by original index (left-to-right), ensuring
  // deterministic output for equal-weight ratios (e.g. [1, 1, 1]).
  const indices = ratios
    .map((_, i) => i)
    .sort((a, b) => {
      const diff = fracRemainders[b]! - fracRemainders[a]!;

      return diff > 0n ? 1 : diff < 0n ? -1 : 0;
    });

  const result = [...floors];
  // `remaining` is always < ratios.length (at most one unit per share), safe for this loop.
  let remaining = absAmount - floors.reduce((a, b) => a + b, 0n);

  for (let i = 0; remaining > 0n; i++, remaining--) {
    result[indices[i]!]! += 1n;
  }

  return result.map((amount) => ({ amount: negative ? -amount : amount, currency: m.currency })) as [Money, ...Money[]];
}

// ─── Aggregates ──────────────────────────────────────────────────────────────

/**
 * Sums an array of `Money` values. Throws if the array is empty or currencies differ.
 *
 * @example
 * ```ts
 * sum([money('1.00', 'USD'), money('2.50', 'USD')]) // $3.50
 * ```
 */
export function sum(moneys: readonly Money[]): Money {
  if (moneys.length === 0) throw new CoinsError('sum requires at least one Money value');

  const currency = moneys[0]!.currency;

  for (let i = 1; i < moneys.length; i++) {
    if (moneys[i]!.currency !== currency) {
      throw new CurrencyMismatchError(currency, moneys[i]!.currency);
    }
  }

  return { amount: moneys.reduce((acc, m) => acc + m.amount, 0n), currency };
}

/**
 * Returns the smallest `Money` value from a non-empty array. Throws if currencies differ.
 *
 * @example
 * ```ts
 * min([money('3.00', 'USD'), money('1.00', 'USD'), money('2.00', 'USD')]) // $1.00
 * ```
 */
export function min(moneys: readonly Money[]): Money {
  if (moneys.length === 0) throw new CoinsError('min requires at least one Money value');

  let result = moneys[0]!;

  for (let i = 1; i < moneys.length; i++) result = compare(result, moneys[i]!) <= 0 ? result : moneys[i]!;

  return result;
}

/**
 * Returns the largest `Money` value from a non-empty array. Throws if currencies differ.
 *
 * @example
 * ```ts
 * max([money('1.00', 'USD'), money('3.00', 'USD'), money('2.00', 'USD')]) // $3.00
 * ```
 */
export function max(moneys: readonly Money[]): Money {
  if (moneys.length === 0) throw new CoinsError('max requires at least one Money value');

  let result = moneys[0]!;

  for (let i = 1; i < moneys.length; i++) result = compare(result, moneys[i]!) >= 0 ? result : moneys[i]!;

  return result;
}

/**
 * Splits `money` into `parts` equal shares without losing or gaining a single minor unit.
 * Equivalent to `allocate(money, Array.from({ length: parts }, () => 1))`.
 *
 * @throws {CoinsError} If `parts` is not a positive integer (≥ 1).
 *
 * @example
 * ```ts
 * splitEvenly(money('10.00', 'USD'), 3)
 * // → [$3.34, $3.33, $3.33]
 * ```
 */
export function splitEvenly(m: Money, parts: number): [Money, ...Money[]] {
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new CoinsError('splitEvenly requires a positive integer number of parts');
  }

  return allocate(
    m,
    Array.from({ length: parts }, () => 1),
  );
}

/**
 * Clamps `m` to the inclusive range `[lower, upper]`.
 *
 * @throws {CurrencyMismatchError} If `m`, `lower`, or `upper` have different currencies.
 * @throws {RangeError}            If `lower > upper`.
 *
 * @example
 * ```ts
 * clamp(money('5.00', 'USD'), money('1.00', 'USD'), money('10.00', 'USD'))  // $5.00
 * clamp(money('0.00', 'USD'), money('1.00', 'USD'), money('10.00', 'USD'))  // $1.00
 * clamp(money('15.00', 'USD'), money('1.00', 'USD'), money('10.00', 'USD')) // $10.00
 * ```
 */
export function clamp(m: Money, lower: Money, upper: Money): Money {
  // Validate currency consistency upfront so the error always names the mismatch,
  // rather than surfacing mid-computation from min() or max().
  if (m.currency !== lower.currency || m.currency !== upper.currency) {
    throw new CurrencyMismatchError(m.currency, m.currency !== lower.currency ? lower.currency : upper.currency);
  }

  if (compare(lower, upper) > 0) {
    throw new CoinsError(
      `clamp: lower (${toDecimal(lower)} ${lower.currency}) must be <= upper (${toDecimal(upper)} ${upper.currency})`,
    );
  }

  return max([lower, min([m, upper])]);
}

// ─── Unary ───────────────────────────────────────────────────────────────────

/** Returns the absolute value of `money`. Negative amounts become positive. */
export function abs(m: Money): Money {
  return { amount: m.amount < 0n ? -m.amount : m.amount, currency: m.currency };
}

/** Returns `money` with its sign flipped. */
export function negate(m: Money): Money {
  return { amount: -m.amount, currency: m.currency };
}

// ─── Comparison ──────────────────────────────────────────────────────────────

/**
 * Compares two `Money` values. Returns `-1`, `0`, or `1`.
 * Throws if their currencies differ.
 */
export function compare(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);

  if (a.amount < b.amount) return -1;

  if (a.amount > b.amount) return 1;

  return 0;
}

/**
 * Returns `true` if both `Money` values have the same currency and amount.
 * Returns `false` if currencies differ — safe to use in `.filter()` and conditional chains.
 */
export function isEqual(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.amount === b.amount;
}

/** Returns `true` if `a` is strictly greater than `b`. Throws on currency mismatch. */
export function greaterThan(a: Money, b: Money): boolean {
  return compare(a, b) > 0;
}

/** Returns `true` if `a` is greater than or equal to `b`. Throws on currency mismatch. */
export function greaterThanOrEqual(a: Money, b: Money): boolean {
  return compare(a, b) >= 0;
}

/** Returns `true` if `a` is strictly less than `b`. Throws on currency mismatch. */
export function lessThan(a: Money, b: Money): boolean {
  return compare(a, b) < 0;
}

/** Returns `true` if `a` is less than or equal to `b`. Throws on currency mismatch. */
export function lessThanOrEqual(a: Money, b: Money): boolean {
  return compare(a, b) <= 0;
}

// ─── Predicates ──────────────────────────────────────────────────────────────

/** Returns `true` if the amount is exactly zero. */
export function isZero(m: Money): boolean {
  return m.amount === 0n;
}

/** Returns `true` if the amount is strictly positive (> 0). */
export function isPositive(m: Money): boolean {
  return m.amount > 0n;
}

/** Returns `true` if the amount is strictly negative (< 0). */
export function isNegative(m: Money): boolean {
  return m.amount < 0n;
}

/** Returns `true` if the amount is zero or positive (>= 0). */
export function isNonNegative(m: Money): boolean {
  return m.amount >= 0n;
}

/** Returns `true` if the amount is zero or negative (<= 0). */
export function isNonPositive(m: Money): boolean {
  return m.amount <= 0n;
}

// ─── Serialization ───────────────────────────────────────────────────────────

/**
 * Serializes a `Money` value to a plain-object JSON-safe form.
 * `amount` is a bigint string (e.g. `'123456'`) to avoid `JSON.stringify` throwing.
 *
 * @example
 * ```ts
 * toJSON(money('1234.56', 'USD')) // { amount: '123456', currency: 'USD' }
 * JSON.stringify(toJSON(price))   // '{"amount":"123456","currency":"USD"}'
 * ```
 */
export function toJSON(m: Money): MoneyJSON {
  return { amount: String(m.amount), currency: m.currency };
}

/**
 * Deserializes a `MoneyJSON` object back into a `Money` value.
 * Validates the currency code and the amount string.
 *
 * @example
 * ```ts
 * fromJSON({ amount: '123456', currency: 'USD' }) // { amount: 123456n, currency: 'USD' }
 * ```
 */
export function fromJSON(json: MoneyJSON): Money {
  const validCurrency = validateCurrencyCode(json.currency);

  if (typeof json.amount !== 'string') {
    throw new CoinsError(
      `Invalid money amount in JSON: ${String(json.amount)} (expected an integer string, e.g. '123456')`,
    );
  }

  let amount: bigint;

  try {
    amount = BigInt(json.amount);
  } catch {
    throw new CoinsError(`Invalid money amount in JSON: "${json.amount}" (expected an integer string, e.g. '123456')`);
  }

  return { amount, currency: validCurrency };
}

/**
 * Serializes a `Money` value to a decimal string (e.g. `'1234.56'`).
 * Round-trips losslessly with `money()`.
 *
 * @example
 * ```ts
 * toDecimal(money('1234.56', 'USD')) // '1234.56'
 * toDecimal(money(5n, 'USD'))        // '0.05'
 * toDecimal(money(1234n, 'JPY'))     // '1234'
 * ```
 */
export function toDecimal(m: Money): string {
  const decimals = getCurrencyDecimals(m.currency);

  if (decimals === 0) return String(m.amount);

  const negative = m.amount < 0n;
  const abs = negative ? -m.amount : m.amount;
  const scale = pow10(decimals);
  const whole = abs / scale;
  const frac = (abs % scale).toString().padStart(decimals, '0');

  return `${negative ? '-' : ''}${whole}.${frac}`;
}

/**
 * Converts a `Money` value to a floating-point number.
 * Useful for charting and display; **not** for arithmetic (lossy).
 *
 * @example
 * ```ts
 * toNumber(money('1234.56', 'USD')) // 1234.56
 * ```
 */
export function toNumber(m: Money): number {
  const decimals = getCurrencyDecimals(m.currency);

  return Number(m.amount) / Number(pow10(decimals));
}

// ─── Rounding ─────────────────────────────────────────────────────────────────

/**
 * Rounds a `Money` value to fewer decimal places than the currency's default.
 * `places` must be a non-negative integer in the range `0..currencyDecimals`.
 *
 * Useful for display purposes (e.g. rounding USD to whole dollars).
 * Throws `RangeError` if `places` is out of the allowed range.
 *
 * @param mode Rounding mode. Defaults to `'half-away-from-zero'`.
 *
 * @example
 * ```ts
 * roundTo(money('1234.56', 'USD'), 0)          // $1235   (whole dollars)
 * roundTo(money('1234.56', 'USD'), 1)          // $1234.6
 * roundTo(money('1234.56', 'USD'), 1, 'floor') // $1234.5
 * roundTo(money('1234', 'JPY'), 0)             // ¥1234   (no-op: JPY is already 0-decimal)
 * ```
 */
export function roundTo(m: Money, places: number, mode: RoundingMode = 'half-away-from-zero'): Money {
  if (!Number.isInteger(places) || places < 0) {
    throw new CoinsError(`roundTo: places must be a non-negative integer, got ${places}`);
  }

  const currencyDecimals = getCurrencyDecimals(m.currency);

  if (places > currencyDecimals) {
    throw new CoinsError(
      `roundTo: places (${places}) exceeds the decimal places for ${m.currency} (${currencyDecimals})`,
    );
  }

  if (places === currencyDecimals) return m;

  const drop = currencyDecimals - places;
  const divisor = pow10(drop);
  const negative = m.amount < 0n;
  const absAmount = negative ? -m.amount : m.amount;
  const quotient = absAmount / divisor;
  const remainder = absAmount % divisor;
  const rounded = applyRounding(quotient, remainder, divisor, mode, negative);

  return { amount: negative ? -rounded : rounded, currency: m.currency };
}

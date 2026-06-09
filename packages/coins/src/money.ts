import type { CurrencyCode, Money, MoneyJSON, RoundingMode } from './types';

import { applyRounding, getCurrencyDecimals, parseRational, pow10, validateCurrencyCode } from './utils';

// ─── Factories ───────────────────────────────────────────────────────────────

/**
 * Returns a validated `CurrencyCode` for the given ISO 4217 code string.
 * Throws `RangeError` for unrecognized codes.
 *
 * Use this to obtain a `CurrencyCode` when you have a plain string from user
 * input or an API response, before constructing `Money` or `ExchangeRate`.
 *
 * @example
 * ```ts
 * const usd = toCurrencyCode('USD');    // CurrencyCode — validated
 * toCurrencyCode('NOTREAL');            // throws RangeError
 * ```
 */
export function toCurrencyCode(code: string): CurrencyCode {
  return validateCurrencyCode(code);
}

/**
 * Creates a `Money` value from a decimal string, number, or raw bigint minor units.
 * Validates the currency code — throws `RangeError` for unrecognised ISO 4217 codes.
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

  // getCurrencyDecimals is cached from the assertValidCurrency call above.
  return { amount: parseToMinorUnits(String(amount), getCurrencyDecimals(validCurrency)), currency: validCurrency };
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(`Currency mismatch: ${a.currency} and ${b.currency}`);
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
 * Creates a `Money` value with a zero amount for the given currency.
 * Equivalent to `money(0n, currency)` but more expressive.
 *
 * @example
 * ```ts
 * zero('USD')  // { amount: 0n, currency: 'USD' }
 * zero('JPY')  // { amount: 0n, currency: 'JPY' }
 * ```
 */
export function zero(currency: string): Money {
  return money(0n, currency);
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

  if (numerator === 0n) throw new RangeError('Division by zero');

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
  if (ratios.length === 0) throw new RangeError('allocate requires at least one ratio');

  const parsedRatios = ratios.map((r) => parseRational(String(r)));

  if (parsedRatios.some((p) => p.negative)) throw new RangeError('All ratios must be non-negative');

  if (!parsedRatios.some((p) => p.numerator > 0n)) throw new RangeError('At least one ratio must be positive');

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
  if (moneys.length === 0) throw new RangeError('sum requires at least one Money value');

  const currency = moneys[0]!.currency;

  for (let i = 1; i < moneys.length; i++) {
    if (moneys[i]!.currency !== currency) {
      throw new TypeError(`Currency mismatch: ${currency} and ${moneys[i]!.currency}`);
    }
  }

  return { amount: moneys.reduce((acc, m) => acc + m.amount, 0n), currency };
}

/**
 * Returns the smallest `Money` value. Throws if currencies differ.
 *
 * @example
 * ```ts
 * min(money('3.00', 'USD'), money('1.00', 'USD'), money('2.00', 'USD')) // $1.00
 * ```
 */
export function min(first: Money, ...rest: Money[]): Money {
  return [first, ...rest].reduce((a, b) => (compare(a, b) <= 0 ? a : b));
}

/**
 * Returns the largest `Money` value. Throws if currencies differ.
 *
 * @example
 * ```ts
 * max(money('1.00', 'USD'), money('3.00', 'USD'), money('2.00', 'USD')) // $3.00
 * ```
 */
export function max(first: Money, ...rest: Money[]): Money {
  return [first, ...rest].reduce((a, b) => (compare(a, b) >= 0 ? a : b));
}

/**
 * Splits `money` into `parts` equal shares without losing or gaining a single minor unit.
 * Equivalent to `allocate(money, Array.from({ length: parts }, () => 1))`.
 *
 * @throws {RangeError} If `parts` is not a positive integer.
 *
 * @example
 * ```ts
 * splitEvenly(money('10.00', 'USD'), 3)
 * // → [$3.34, $3.33, $3.33]
 * ```
 */
export function splitEvenly(m: Money, parts: number): [Money, ...Money[]] {
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new RangeError('splitEvenly requires a positive integer number of parts');
  }

  return allocate(
    m,
    Array.from({ length: parts }, () => 1),
  );
}

/**
 * Clamps `m` to the inclusive range `[lower, upper]`.
 * Throws `TypeError` on currency mismatch. Throws `RangeError` if `lower > upper`.
 *
 * @example
 * ```ts
 * clamp(money('5.00', 'USD'), money('1.00', 'USD'), money('10.00', 'USD'))  // $5.00
 * clamp(money('0.00', 'USD'), money('1.00', 'USD'), money('10.00', 'USD'))  // $1.00
 * clamp(money('15.00', 'USD'), money('1.00', 'USD'), money('10.00', 'USD')) // $10.00
 * ```
 */
export function clamp(m: Money, lower: Money, upper: Money): Money {
  if (compare(lower, upper) > 0) {
    throw new RangeError(
      `clamp: lower (${toDecimal(lower)} ${lower.currency}) must be <= upper (${toDecimal(upper)} ${upper.currency})`,
    );
  }

  return max(lower, min(m, upper));
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

/**
 * Returns `percentage`% of `money`, i.e. `money × (percentage / 100)`.
 * Use a string percentage for lossless precision (e.g. `'8.5'` for 8.5%).
 *
 * @param mode Rounding mode for fractional minor units. Defaults to `'half-away-from-zero'`.
 *
 * @example
 * ```ts
 * percentage(money('100.00', 'USD'), 10)      // $10.00
 * percentage(money('199.99', 'USD'), '8.5')   // $16.99
 * ```
 */
export function percentage(m: Money, pct: number | string, mode: RoundingMode = 'half-away-from-zero'): Money {
  const { denominator, negative: pctNegative, numerator } = parseRational(String(pct));
  const scale = 100n;
  const negative = m.amount < 0n !== pctNegative;
  const absAmount = m.amount < 0n ? -m.amount : m.amount;
  const raw = absAmount * numerator;
  const divisor = denominator * scale;
  const quotient = raw / divisor;
  const result = applyRounding(quotient, raw % divisor, divisor, mode, negative);

  return { amount: negative ? -result : result, currency: m.currency };
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
 * Throws on currency mismatch — consistent with all other comparison functions.
 * Use `a.currency === b.currency` directly if you need a silent cross-currency check.
 */
export function isEqual(a: Money, b: Money): boolean {
  assertSameCurrency(a, b);

  return a.amount === b.amount;
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
  let amount: bigint;

  try {
    amount = BigInt(json.amount);
  } catch {
    throw new SyntaxError(`Invalid money amount in JSON: "${json.amount}" (expected an integer string, e.g. '123456')`);
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

  return Number(m.amount) / Math.pow(10, decimals);
}

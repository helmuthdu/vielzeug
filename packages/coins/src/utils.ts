import type { CurrencyCode, RoundingMode } from './types';

// Inline bounded FIFO cache — no external dependency required.
// Evicts the oldest entry when the size limit is reached (Map insertion-order iteration).
export function lruCache<K, V>(maxSize: number): { get(k: K): V | undefined; set(k: K, v: V): void } {
  const map = new Map<K, V>();

  return {
    get: (k) => map.get(k),
    set: (k, v) => {
      if (map.size >= maxSize) map.delete(map.keys().next().value as K);

      map.set(k, v);
    },
  };
}

const currencyDecimalsCache = lruCache<string, number>(512);

/**
 * Returns the number of minor-unit decimal places for a given ISO 4217 currency code.
 * Uses `Intl.NumberFormat` to resolve the canonical value (e.g. USD→2, JPY→0, KWD→3).
 * Throws `RangeError` for unrecognized codes or when the runtime cannot determine decimals.
 */
export function getCurrencyDecimals(currencyCode: string): number {
  const cached = currencyDecimalsCache.get(currencyCode);

  if (cached !== undefined) return cached;

  let resolved: number | undefined;

  try {
    resolved = new Intl.NumberFormat('en', { currency: currencyCode, style: 'currency' }).resolvedOptions()
      .maximumFractionDigits;
  } catch {
    throw new RangeError(`Invalid ISO 4217 currency code: "${currencyCode}"`);
  }

  if (resolved === undefined) {
    throw new RangeError(`Could not determine decimal places for currency: "${currencyCode}"`);
  }

  currencyDecimalsCache.set(currencyCode, resolved);

  return resolved;
}

/**
 * Validates an ISO 4217 currency code and returns it as a `CurrencyCode`.
 * Throws `RangeError` if unrecognized. Uses `getCurrencyDecimals` internally so
 * the result is cached for subsequent decimal lookups.
 */
export function validateCurrencyCode(code: string): CurrencyCode {
  getCurrencyDecimals(code);

  return code as CurrencyCode;
}

/**
 * Returns the absolute value of `a % b`.
 * Avoids computing `a % b` twice in callers that need both quotient and |remainder|.
 */
export function absMod(a: bigint, b: bigint): bigint {
  const r = a % b;

  return r < 0n ? -r : r;
}

/** Returns `10n ** BigInt(exponent)`. */
export function pow10(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

/** Regex for valid decimal strings accepted by `parseRational`. */
const DECIMAL_RE = /^-?\d+(\.\d+)?$/;

/**
 * Parses a decimal string into a rational `{ numerator, denominator, negative }`.
 * The denominator is always a power of 10 and the numerator is always non-negative.
 * Throws `RangeError` for non-numeric input.
 *
 * @example
 * parseRational('1.5')  → { numerator: 15n, denominator: 10n, negative: false }
 * parseRational('-0.5') → { numerator: 5n,  denominator: 10n, negative: true  }
 * parseRational('3')    → { numerator: 3n,  denominator: 1n,  negative: false }
 */
export function parseRational(str: string): { denominator: bigint; negative: boolean; numerator: bigint } {
  if (!DECIMAL_RE.test(str)) {
    throw new RangeError(`Invalid decimal string: "${str}"`);
  }

  const negative = str.startsWith('-');
  const absStr = negative ? str.slice(1) : str;
  const dotIndex = absStr.indexOf('.');
  const intStr = dotIndex === -1 ? absStr : absStr.slice(0, dotIndex);
  const fracStr = dotIndex === -1 ? '' : absStr.slice(dotIndex + 1);
  const denominator = pow10(fracStr.length);
  const numerator = BigInt(intStr || '0') * denominator + BigInt(fracStr || '0');

  return { denominator, negative, numerator };
}

/**
 * Applies a rounding mode to a truncated division result.
 *
 * **Contract**: `quotient` and `absRemainder` must be non-negative (absolute values).
 * The caller is responsible for:
 *   1. Computing everything in terms of absolute values.
 *   2. Passing `negative = true` when the true mathematical result is negative.
 *   3. Applying the sign after: `negative ? -result : result`.
 *
 * Returns the absolute value of the rounded result.
 *
 * @param quotient     Non-negative integer part of the division (`|dividend| / divisor`).
 * @param absRemainder Non-negative remainder (`|dividend| % divisor`).
 * @param denominator  The divisor used to produce quotient/remainder.
 * @param mode         The desired rounding mode.
 * @param negative     Whether the true mathematical result is negative. Defaults to `false`.
 */
export function applyRounding(
  quotient: bigint,
  absRemainder: bigint,
  denominator: bigint,
  mode: RoundingMode,
  negative = false,
): bigint {
  if (absRemainder === 0n) return quotient;

  switch (mode) {
    case 'ceiling':
      // Toward +∞: round up for positive results, truncate for negative results.
      return negative ? quotient : quotient + 1n;

    case 'down':
      // Toward zero: always truncate.
      return quotient;

    case 'floor':
      // Toward −∞: truncate for positive results, one step more for negative results.
      return negative ? quotient + 1n : quotient;

    case 'half-away-from-zero':
      return absRemainder * 2n >= denominator ? quotient + 1n : quotient;

    case 'half-even': {
      const twice = absRemainder * 2n;

      if (twice < denominator) return quotient;

      if (twice > denominator) return quotient + 1n;

      // Exactly half — round to the nearest even integer.
      return quotient % 2n === 0n ? quotient : quotient + 1n;
    }

    case 'up':
      // Away from zero: always round away.
      return quotient + 1n;

    default:
      throw new RangeError(`Unknown rounding mode: ${String(mode)}`);
  }
}

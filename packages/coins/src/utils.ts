import { cache } from '@vielzeug/arsenal';

import type { CurrencyCode, RoundingMode } from './types';

const currencyDecimalsCache = cache<string, number>(128);

/**
 * Returns the number of minor-unit decimal places for a given ISO 4217 currency code.
 * Uses Intl.NumberFormat to resolve the canonical value (e.g. USD→2, JPY→0, KWD→3).
 * Throws `RangeError` for unrecognized currency codes.
 */
export function getCurrencyDecimals(currencyCode: string): number {
  const cached = currencyDecimalsCache.get(currencyCode);

  if (cached !== undefined) return cached;

  let decimals: number;

  try {
    decimals =
      new Intl.NumberFormat('en', { currency: currencyCode, style: 'currency' }).resolvedOptions()
        .maximumFractionDigits ?? 2;
  } catch {
    throw new RangeError(`Invalid ISO 4217 currency code: "${currencyCode}"`);
  }

  currencyDecimalsCache.set(currencyCode, decimals);

  return decimals;
}

/**
 * Validates an ISO 4217 currency code and returns it as a `CurrencyCode`.
 * Throws `RangeError` if unrecognized. Uses `getCurrencyDecimals` internally so
 * the result is cached for subsequent decimal lookups.
 */
export function assertValidCurrency(code: string): CurrencyCode {
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

/**
 * Parses a decimal string into a rational `{ numerator, denominator, negative }`.
 * The denominator is always a power of 10, and the numerator is always non-negative.
 *
 * @example
 * parseRational('1.5')  → { numerator: 15n, denominator: 10n, negative: false }
 * parseRational('-0.5') → { numerator: 5n,  denominator: 10n, negative: true  }
 * parseRational('3')    → { numerator: 3n,  denominator: 1n,  negative: false }
 */
export function parseRational(str: string): { denominator: bigint; negative: boolean; numerator: bigint } {
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
 * Applies a rounding mode to a truncated-toward-zero division result.
 *
 * @param quotient     The integer part of the division (BigInt truncation toward zero).
 * @param absRemainder Absolute value of the remainder.
 * @param denominator  The divisor used to produce quotient/remainder.
 * @param mode         The desired rounding mode.
 * @param isPositive   Whether the un-truncated result is non-negative.
 */
export function applyRounding(
  quotient: bigint,
  absRemainder: bigint,
  denominator: bigint,
  mode: RoundingMode,
  isPositive: boolean,
): bigint {
  if (absRemainder === 0n) return quotient;

  const increment = isPositive ? 1n : -1n;

  switch (mode) {
    case 'ceiling':
      // Toward +∞: truncation IS ceiling for negatives; positives need one step up.
      return isPositive ? quotient + 1n : quotient;

    case 'down':
      return quotient;

    case 'floor':
      // Toward −∞: truncation IS floor for positives; negatives need one more step down.
      return isPositive ? quotient : quotient - 1n;

    case 'half-away-from-zero':
      return absRemainder * 2n >= denominator ? quotient + increment : quotient;

    case 'half-even': {
      const twice = absRemainder * 2n;

      if (twice < denominator) return quotient;

      if (twice > denominator) return quotient + increment;

      // Exactly half — round to the nearest even integer.
      return quotient % 2n === 0n ? quotient : quotient + increment;
    }

    case 'up':
      return quotient + increment;

    default:
      throw new RangeError(`Unknown rounding mode: ${String(mode)}`);
  }
}

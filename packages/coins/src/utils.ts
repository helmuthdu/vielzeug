import type { RoundingMode } from './types';

import { boundedCache } from './_cache';
import { CoinsError, InvalidCurrencyError } from './errors';

const currencyDecimalsCache = boundedCache<string, number>(512);

/**
 * Returns the number of minor-unit decimal places for a given ISO 4217 currency code.
 * Uses `Intl.NumberFormat` to resolve the canonical value (e.g. USD→2, JPY→0, KWD→3).
 * Throws `InvalidCurrencyError` for unrecognized codes or when the runtime cannot determine decimals.
 */
export function getCurrencyDecimals(currencyCode: string): number {
  const cached = currencyDecimalsCache.get(currencyCode);

  if (cached !== undefined) return cached;

  let resolved: number | undefined;

  try {
    resolved = new Intl.NumberFormat('en', { currency: currencyCode, style: 'currency' }).resolvedOptions()
      .maximumFractionDigits;
  } catch {
    throw new InvalidCurrencyError(currencyCode);
  }

  if (resolved === undefined) {
    throw new InvalidCurrencyError(currencyCode);
  }

  currencyDecimalsCache.set(currencyCode, resolved);

  return resolved;
}

/**
 * Validates an ISO 4217 currency code and returns it.
 * Throws `InvalidCurrencyError` if unrecognized. Uses `getCurrencyDecimals` internally so
 * the result is cached for subsequent decimal lookups.
 */
export function validateCurrencyCode(code: string): string {
  getCurrencyDecimals(code);

  return code;
}

/** Returns `10n ** BigInt(exponent)`. */
export function pow10(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

/** Regex for valid decimal strings accepted by `parseRational`. */
const DECIMAL_RE = /^-?\d+(\.\d+)?$/;
/** Regex matching JavaScript scientific-notation strings, e.g. `'1e-7'`, `'-3.14E+5'`. */
const SCIENTIFIC_RE = /^(-?\d+\.?\d*)[eE]([+-]?\d+)$/;

/** Maximum absolute exponent allowed in scientific notation. Prevents '0'.repeat(N) allocation attacks. */
const MAX_SCIENTIFIC_EXP = 1000;

/**
 * Expands a scientific-notation decimal string into a plain decimal string.
 * `'1e-7'` → `'0.0000001'`, `'1.23e+5'` → `'123000'`.
 * Only called when `SCIENTIFIC_RE` already matched — no extra validation.
 * Throws `RangeError` if the absolute exponent exceeds `MAX_SCIENTIFIC_EXP` (1000).
 */
function expandScientific(s: string): string {
  const match = SCIENTIFIC_RE.exec(s)!;
  const coeff = match[1]!;
  const exp = parseInt(match[2]!, 10);

  if (Math.abs(exp) > MAX_SCIENTIFIC_EXP) {
    throw new CoinsError(`Scientific notation exponent too large: "${s}" (max ±${MAX_SCIENTIFIC_EXP})`);
  }

  const isNeg = coeff.startsWith('-');
  const absCoeff = isNeg ? coeff.slice(1) : coeff;
  const dotIndex = absCoeff.indexOf('.');
  const digits = dotIndex === -1 ? absCoeff : absCoeff.replace('.', '');
  const fracLen = dotIndex === -1 ? 0 : absCoeff.length - dotIndex - 1;
  const newExp = exp - fracLen; // where the decimal point sits relative to end of digits

  let result: string;

  if (newExp >= 0) {
    // All digits are to the left of the decimal — append trailing zeros
    result = digits + '0'.repeat(newExp);
  } else {
    const intLen = digits.length + newExp; // digits before the decimal point

    if (intLen <= 0) {
      // Pure fraction: '0.' + leading zeros + digits
      result = '0.' + '0'.repeat(-intLen) + digits;
    } else {
      result = digits.slice(0, intLen) + '.' + digits.slice(intLen);
    }
  }

  return isNeg ? `-${result}` : result;
}

/**
 * Parses a decimal string into a rational `{ numerator, denominator, negative }`.
 * The denominator is always a power of 10 and the numerator is always non-negative.
 * Throws `RangeError` for non-numeric input.
 *
 * Accepts standard decimal strings and JavaScript scientific notation
 * (e.g. `'1e-7'`, `'1.23E+5'`) — the latter is automatically expanded before parsing.
 *
 * @example
 * parseRational('1.5')   → { numerator: 15n, denominator: 10n, negative: false }
 * parseRational('-0.5')  → { numerator: 5n,  denominator: 10n, negative: true  }
 * parseRational('3')     → { numerator: 3n,  denominator: 1n,  negative: false }
 * parseRational('1e-7')  → { numerator: 1n,  denominator: 10000000n, negative: false }
 *
 * Note: `'-0'` and `'-0.0'` produce `{ negative: true, numerator: 0n, ... }`.
 * Callers that compute `negative ? -result : result` on `0n` remain correct
 * because `-0n === 0n` in bigint arithmetic.
 */
export function parseRational(str: string): { denominator: bigint; negative: boolean; numerator: bigint } {
  // Expand scientific notation (e.g. from String(1e-7) = '1e-7') before validation.
  const normalized = SCIENTIFIC_RE.test(str) ? expandScientific(str) : str;

  if (!DECIMAL_RE.test(normalized)) {
    throw new CoinsError(`Invalid decimal string: "${str}"`);
  }

  const negative = normalized.startsWith('-');
  const absStr = negative ? normalized.slice(1) : normalized;
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
      throw new CoinsError(`Unknown rounding mode: ${String(mode)}`);
  }
}

import type { Decimal, RoundingMode } from './types';

import { CoinsError } from './errors';

const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?$/;
const MAX_DECIMAL_DIGITS = 1000;
const MAX_DECIMAL_PLACES = 100;

export function decimal(value: string): Decimal {
  if (value.length > MAX_DECIMAL_DIGITS) throw new CoinsError('INVALID_DECIMAL', 'Decimal input is too long');

  const match = DECIMAL.exec(value);

  if (!match) throw new CoinsError('INVALID_DECIMAL', `Invalid decimal: "${value}"`);

  const fraction = (match[3] ?? '').replace(/0+$/, '');

  if (fraction.length > MAX_DECIMAL_PLACES) {
    throw new CoinsError('INVALID_DECIMAL', `Decimal precision cannot exceed ${MAX_DECIMAL_PLACES} places`);
  }

  const denominator = 10n ** BigInt(fraction.length);
  const unsigned = BigInt(match[2]!) * denominator + BigInt(fraction || '0');
  const numerator = match[1] === '-' && unsigned !== 0n ? -unsigned : unsigned;
  const divisor = gcd(numerator < 0n ? -numerator : numerator, denominator);

  return Object.freeze({ denominator: denominator / divisor, numerator: numerator / divisor }) as Decimal;
}

export function roundDivision(numerator: bigint, denominator: bigint, mode: RoundingMode): bigint {
  if (denominator <= 0n) throw new CoinsError('INVALID_DECIMAL', 'Decimal denominator must be positive');

  const negative = numerator < 0n;
  const absolute = negative ? -numerator : numerator;
  const quotient = absolute / denominator;
  const remainder = absolute % denominator;

  if (remainder === 0n) return negative ? -quotient : quotient;

  const increment = (() => {
    switch (mode) {
      case 'awayFromZero':
        return true;
      case 'ceil':
        return !negative;
      case 'floor':
        return negative;
      case 'halfAwayFromZero':
        return remainder * 2n >= denominator;
      case 'halfEven': {
        const doubled = remainder * 2n;

        return doubled > denominator || (doubled === denominator && quotient % 2n !== 0n);
      }
      case 'towardZero':
        return false;
    }
  })();

  const result = increment ? quotient + 1n : quotient;

  return negative ? -result : result;
}

export function toDecimalString(amount: bigint, minorUnit: number): string {
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const scale = 10n ** BigInt(minorUnit);
  const whole = absolute / scale;

  if (minorUnit === 0) return `${negative ? '-' : ''}${whole}`;

  const fraction = (absolute % scale).toString().padStart(minorUnit, '0');

  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

export function gcd(left: bigint, right: bigint): bigint {
  let a = left;
  let b = right;

  while (b !== 0n) [a, b] = [b, a % b];

  return a === 0n ? 1n : a;
}

export function lcm(left: bigint, right: bigint): bigint {
  return (left / gcd(left, right)) * right;
}

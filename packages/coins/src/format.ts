import { assertRoundingMode } from './_decimal';
import { CoinsError } from './errors';
import { assertMoney, toDecimal } from './money';
import type { FormatOptions, Money, MoneyFormatPart, RoundingMode } from './types';

const MAX_FRACTION_DIGITS = 20;
const defaultFormatRounding: RoundingMode = 'halfAwayFromZero';
const intlRoundingModes: Record<RoundingMode, Intl.NumberFormatOptions['roundingMode']> = {
  awayFromZero: 'expand',
  ceil: 'ceil',
  floor: 'floor',
  halfAwayFromZero: 'halfExpand',
  halfEven: 'halfEven',
  towardZero: 'trunc',
};

export function format(value: Money, options: FormatOptions = {}): string {
  return formatParts(value, options)
    .map((part) => part.value)
    .join('');
}

export function formatParts(value: Money, options: FormatOptions = {}): MoneyFormatPart[] {
  assertMoney(value);
  assertRoundingMode(options.rounding ?? defaultFormatRounding);

  const { maximum, minimum } = fractionDigits(value.currency.minorUnit, options);
  const style = options.style ?? 'symbol';

  try {
    const formatter = new Intl.NumberFormat(options.locale ?? 'en-US', {
      currency: value.currency.code,
      currencyDisplay: style,
      maximumFractionDigits: maximum,
      minimumFractionDigits: minimum,
      roundingMode: intlRoundingModes[options.rounding ?? defaultFormatRounding],
      style: 'currency',
      useGrouping: true,
    });

    return normalizeParts(formatter.formatToParts(toDecimal(value) as unknown as number));
  } catch (error) {
    if (error instanceof CoinsError) throw error;

    throw new CoinsError(
      'FORMAT_ERROR',
      `Cannot format currency "${value.currency.code}" for locale "${options.locale ?? 'en-US'}"`,
      { cause: error },
    );
  }
}

function fractionDigits(scale: number, options: FormatOptions): { maximum: number; minimum: number } {
  const requestedMaximum = options.maximumFractionDigits;
  const requestedMinimum = options.minimumFractionDigits;

  validateFractionDigit('maximumFractionDigits', requestedMaximum);
  validateFractionDigit('minimumFractionDigits', requestedMinimum);

  const maximum = requestedMaximum ?? Math.max(scale, requestedMinimum ?? scale);
  const minimum = requestedMinimum ?? Math.min(scale, requestedMaximum ?? scale);

  if (minimum > maximum) {
    throw new CoinsError('FORMAT_ERROR', 'minimumFractionDigits cannot exceed maximumFractionDigits');
  }

  return { maximum, minimum };
}

function validateFractionDigit(name: string, value: number | undefined): void {
  if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > MAX_FRACTION_DIGITS)) {
    throw new CoinsError(
      'FORMAT_ERROR',
      `Fraction digits must be integers satisfying 0 ≤ minimum ≤ maximum ≤ ${MAX_FRACTION_DIGITS} (${name})`,
    );
  }
}

function normalizeParts(raw: Intl.NumberFormatPart[]): MoneyFormatPart[] {
  const parts: MoneyFormatPart[] = [];

  for (const part of raw) {
    if (part.type === 'integer' || part.type === 'group') {
      const previous = parts.at(-1);

      if (previous?.type === 'integer') {
        parts[parts.length - 1] = { type: 'integer', value: previous.value + part.value };
      } else {
        parts.push({ type: 'integer', value: part.value });
      }
    } else if (
      part.type === 'currency' ||
      part.type === 'decimal' ||
      part.type === 'fraction' ||
      part.type === 'literal' ||
      part.type === 'minusSign' ||
      part.type === 'plusSign'
    ) {
      parts.push({ type: part.type, value: part.value });
    } else {
      parts.push({ type: 'literal', value: part.value });
    }
  }

  return parts;
}

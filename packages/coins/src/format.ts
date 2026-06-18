import type { FormatOptions, Money, MoneyFormatPart } from './types';

import { boundedCache } from './_cache';
import { applyRounding, getCurrencyDecimals, pow10 } from './utils';

// Template cache key: locale × currency × style × sign — 512 prevents thrashing in multi-locale apps.
const currencyTemplateCache = boundedCache<string, Intl.NumberFormatPart[]>(512);
// Locale-only key — 32 covers virtually every realistic multi-locale deployment.
const integerFormatterCache = boundedCache<string, Intl.NumberFormat>(32);

/**
 * Resolves and validates all formatting parameters, performs scaling, and
 * produces the pre-computed strings shared by `format()` and `formatParts()`.
 * Throws on invalid options. New options only need to be added in one place.
 */
type FormatState = {
  frac: string;
  intStr: string;
  negative: boolean;
  template: Intl.NumberFormatPart[];
};

function resolveFormatState(m: Money, options: FormatOptions): FormatState {
  const { locale = 'en-US', maximumFractionDigits, minimumFractionDigits, style = 'symbol' } = options;

  const decimalPlaces = getCurrencyDecimals(m.currency);
  const maxFrac = validateFractionDigits('maximumFractionDigits', maximumFractionDigits, decimalPlaces);
  const minFrac = validateFractionDigits(
    'minimumFractionDigits',
    minimumFractionDigits,
    Math.min(decimalPlaces, maxFrac),
  );

  if (minFrac > maxFrac) {
    throw new RangeError('minimumFractionDigits must be less than or equal to maximumFractionDigits');
  }

  const scaled = rescaleMinorUnits(m.amount, decimalPlaces, maxFrac);
  const negative = scaled < 0n;
  const abs = negative ? -scaled : scaled;
  const divisor = pow10(maxFrac);
  const whole = abs / divisor;
  const rawFrac = maxFrac === 0 ? '' : (abs % divisor).toString().padStart(maxFrac, '0');
  const frac = trimFraction(rawFrac, minFrac);
  const template = getCurrencyTemplate(locale, m.currency, style, negative);
  const intStr = getIntegerFormatter(locale).format(whole);

  return { frac, intStr, negative, template };
}

/**
 * Formats a `Money` value as a locale-aware currency string.
 * Uses bigint arithmetic throughout — no floating-point precision loss.
 *
 * When `maximumFractionDigits` is less than the currency's native decimal
 * places, the amount is rescaled using `'half-away-from-zero'` rounding.
 *
 * @example
 * ```ts
 * const price = money('1234.56', 'USD');
 *
 * format(price)                          // '$1,234.56'
 * format(price, { locale: 'de-DE' })    // '1.234,56 $'
 * format(price, { style: 'code' })      // 'USD 1,234.56'
 * format(price, { style: 'name' })      // '1,234.56 US dollars'
 * ```
 */
export function format(m: Money, options: FormatOptions = {}): string {
  return formatParts(m, options)
    .map((p) => p.value)
    .join('');
}

/**
 * Returns the formatted parts of a `Money` value as a structured array.
 * Useful for custom rendering — apply different styles to each semantic segment
 * (currency symbol, integer, decimal separator, fraction, sign).
 *
 * Joining all `value` fields produces the same string as `format()`.
 * When `maximumFractionDigits` reduces precision, rescaling uses
 * `'half-away-from-zero'` rounding.
 *
 * @example
 * ```ts
 * formatParts(money('1234.56', 'USD'))
 * // [
 * //   { type: 'currency', value: '$' },
 * //   { type: 'integer',  value: '1,234' },
 * //   { type: 'decimal',  value: '.' },
 * //   { type: 'fraction', value: '56' },
 * // ]
 * ```
 */
export function formatParts(m: Money, options: FormatOptions = {}): MoneyFormatPart[] {
  const { frac, intStr, template } = resolveFormatState(m, options);
  const hasFrac = frac.length > 0;
  const parts: MoneyFormatPart[] = [];
  let replacedInteger = false;

  for (const part of template) {
    // Group separators (e.g. comma in '1,234') are already embedded in intStr by
    // getIntegerFormatter(), so the template's group parts are intentionally discarded.
    if (part.type === 'group') continue;

    if (part.type === 'integer') {
      if (!replacedInteger) {
        parts.push({ type: 'integer', value: intStr });
        replacedInteger = true;
      }

      continue;
    }

    if (part.type === 'decimal') {
      if (hasFrac) parts.push({ type: 'decimal', value: part.value });

      continue;
    }

    if (part.type === 'fraction') {
      if (hasFrac) parts.push({ type: 'fraction', value: frac });

      continue;
    }

    if (part.type === 'currency') {
      parts.push({ type: 'currency', value: part.value });
    } else if (part.type === 'minusSign') {
      parts.push({ type: 'minusSign', value: part.value });
    } else {
      parts.push({ type: 'literal', value: part.value });
    }
  }

  return parts;
}

function validateFractionDigits(name: string, value: number | undefined, fallback: number): number {
  if (value == null) return fallback;

  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }

  return value;
}

/**
 * Rescales minor units from `sourceFrac` decimal places to `targetFrac`,
 * using half-away-from-zero rounding when reducing precision.
 * Always normalizes to absolute value before rounding and reapplies the sign after.
 */
function rescaleMinorUnits(amount: bigint, sourceFrac: number, targetFrac: number): bigint {
  if (sourceFrac === targetFrac) return amount;

  if (targetFrac > sourceFrac) return amount * pow10(targetFrac - sourceFrac);

  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const factor = pow10(sourceFrac - targetFrac);
  const quotient = abs / factor;
  const result = applyRounding(quotient, abs % factor, factor, 'half-away-from-zero');

  return negative ? -result : result;
}

function trimFraction(value: string, minDigits: number): string {
  if (value.length === 0) return '';

  let end = value.length;

  while (end > minDigits && value[end - 1] === '0') end--;

  return value.slice(0, end);
}

function getCurrencyTemplate(
  locale: string,
  currencyCode: string,
  style: NonNullable<FormatOptions['style']>,
  negative: boolean,
): Intl.NumberFormatPart[] {
  const key = [locale, currencyCode, style, negative ? 'neg' : 'pos'].join('\0');
  const cached = currencyTemplateCache.get(key);

  if (cached !== undefined) return cached;

  const formatter = new Intl.NumberFormat(locale, {
    currency: currencyCode,
    currencyDisplay: style,
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
    style: 'currency',
  });

  const template = formatter.formatToParts(negative ? -1.1 : 1.1);

  currencyTemplateCache.set(key, template);

  return template;
}

function getIntegerFormatter(locale: string): Intl.NumberFormat {
  const cached = integerFormatterCache.get(locale);

  if (cached !== undefined) return cached;

  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    useGrouping: true,
  });

  integerFormatterCache.set(locale, formatter);

  return formatter;
}

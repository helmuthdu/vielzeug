import { cache } from '@vielzeug/arsenal';

import type { FormatOptions, Money } from './types';

import { absMod, applyRounding, getCurrencyDecimals, pow10 } from './utils';

const currencyTemplateCache = cache<string, Intl.NumberFormatPart[]>(128);
const integerFormatterCache = cache<string, Intl.NumberFormat>(64);

/**
 * Formats a `Money` value as a locale-aware currency string.
 * Uses bigint arithmetic throughout — no floating-point precision loss.
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
export function format(money: Money, options: FormatOptions = {}): string {
  const { locale = 'en-US', maximumFractionDigits, minimumFractionDigits, style = 'symbol' } = options;

  const decimalPlaces = getCurrencyDecimals(money.currency);
  const maxFrac = validateFractionDigits('maximumFractionDigits', maximumFractionDigits, decimalPlaces);
  const minFrac = validateFractionDigits('minimumFractionDigits', minimumFractionDigits, decimalPlaces);

  if (minFrac > maxFrac) {
    throw new RangeError('minimumFractionDigits must be less than or equal to maximumFractionDigits');
  }

  const scaled = rescaleMinorUnits(money.amount, decimalPlaces, maxFrac);
  const negative = scaled < 0n;
  const abs = negative ? -scaled : scaled;
  const divisor = pow10(maxFrac);
  const whole = abs / divisor;
  const rawFrac = maxFrac === 0 ? '' : (abs % divisor).toString().padStart(maxFrac, '0');
  const frac = trimFraction(rawFrac, minFrac);

  const template = getCurrencyTemplate(locale, money.currency, style, negative);

  return buildFromTemplate(template, getIntegerFormatter(locale).format(whole), frac);
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
 */
function rescaleMinorUnits(amount: bigint, sourceFrac: number, targetFrac: number): bigint {
  if (sourceFrac === targetFrac) return amount;

  if (targetFrac > sourceFrac) return amount * pow10(targetFrac - sourceFrac);

  const factor = pow10(sourceFrac - targetFrac);
  const quotient = amount / factor;

  return applyRounding(quotient, absMod(amount, factor), factor, 'half-away-from-zero', amount >= 0n);
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

  if (cached) return cached;

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

  if (cached) return cached;

  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    useGrouping: true,
  });

  integerFormatterCache.set(locale, formatter);

  return formatter;
}

function buildFromTemplate(template: Intl.NumberFormatPart[], intPart: string, fracPart: string): string {
  const hasFrac = fracPart.length > 0;
  let replacedInteger = false;
  let output = '';

  for (const part of template) {
    // Skip group separators — `getIntegerFormatter` already adds them via `Intl.NumberFormat`
    // when formatting the integer part. Including them from the template too would duplicate them.
    if (part.type === 'group') continue;

    if (part.type === 'integer') {
      if (!replacedInteger) {
        output += intPart;
        replacedInteger = true;
      }

      continue;
    }

    if (part.type === 'decimal') {
      if (hasFrac) output += part.value;

      continue;
    }

    if (part.type === 'fraction') {
      if (hasFrac) output += fracPart;

      continue;
    }

    output += part.value;
  }

  return output;
}

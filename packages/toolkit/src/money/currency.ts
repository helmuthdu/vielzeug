import type { Money } from './types';

/**
 * Options for currency formatting.
 */
export type CurrencyFormatOptions = {
  locale?: string; // BCP 47 language tag (e.g., 'en-US', 'de-DE')
  maximumFractionDigits?: number; // Maximum decimal places
  minimumFractionDigits?: number; // Minimum decimal places
  style?: 'symbol' | 'code'; // Display style
};

const currencyDecimalsCache = new Map<string, number>();
const currencyTemplateCache = new Map<string, Intl.NumberFormatPart[]>();
const integerFormatterCache = new Map<string, Intl.NumberFormat>();
const pow10Cache = new Map<number, bigint>([[0, 1n]]);

/**
 * Formats a monetary amount as a currency string with proper locale and symbol.
 * Handles decimal places automatically based on currency.
 *
 * @example
 * ```ts
 * const money = { amount: 123456n, currency: 'USD' };
 *
 * currency(money); // '$1,234.56' (default en-US)
 * currency(money, { locale: 'de-DE' }); // '1.234,56 $'
 * currency(money, { style: 'code' }); // 'USD 1,234.56'
 * ```
 *
 * @param money - Money object to format
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function currency(money: Money, options: CurrencyFormatOptions = {}): string {
  const { locale = 'en-US', maximumFractionDigits, minimumFractionDigits, style = 'symbol' } = options;

  // Get decimal places for currency (default to 2 for most currencies)
  const decimalPlaces = getCurrencyDecimals(money.currency);

  validateStyle(style);

  const maxFractionDigits = validateFractionDigits('maximumFractionDigits', maximumFractionDigits, decimalPlaces);
  const minFractionDigits = validateFractionDigits('minimumFractionDigits', minimumFractionDigits, decimalPlaces);

  if (minFractionDigits > maxFractionDigits) {
    throw new RangeError('minimumFractionDigits must be less than or equal to maximumFractionDigits');
  }

  const scaledAmount = rescaleMinorUnits(money.amount, decimalPlaces, maxFractionDigits);
  const isNegative = scaledAmount < 0n;
  const absScaledAmount = isNegative ? -scaledAmount : scaledAmount;
  const divisor = pow10(maxFractionDigits);

  const whole = absScaledAmount / divisor;
  const rawFraction =
    maxFractionDigits === 0 ? '' : (absScaledAmount % divisor).toString().padStart(maxFractionDigits, '0');
  const fraction = trimFraction(rawFraction, minFractionDigits);

  const integerPart = getIntegerFormatter(locale).format(whole);
  const template = getCurrencyTemplate(locale, money.currency, style, isNegative);

  return buildFromTemplate(template, integerPart, fraction);
}

function buildFromTemplate(template: Intl.NumberFormatPart[], integerPart: string, fractionPart: string): string {
  const hasFraction = fractionPart.length > 0;
  let replacedInteger = false;
  let output = '';

  for (const part of template) {
    if (part.type === 'group') {
      continue;
    }

    if (part.type === 'integer') {
      if (!replacedInteger) {
        output += integerPart;
        replacedInteger = true;
      }

      continue;
    }

    if (part.type === 'decimal') {
      if (hasFraction) {
        output += part.value;
      }

      continue;
    }

    if (part.type === 'fraction') {
      if (hasFraction) {
        output += fractionPart;
      }

      continue;
    }

    output += part.value;
  }

  return output;
}

/**
 * Rescales minor units to the requested fraction precision using half-away-from-zero rounding.
 *
 * @internal
 */
function rescaleMinorUnits(amount: bigint, sourceFractionDigits: number, targetFractionDigits: number): bigint {
  if (sourceFractionDigits === targetFractionDigits) {
    return amount;
  }

  if (targetFractionDigits > sourceFractionDigits) {
    return amount * pow10(targetFractionDigits - sourceFractionDigits);
  }

  const factor = pow10(sourceFractionDigits - targetFractionDigits);
  const quotient = amount / factor;
  const remainder = amount % factor;

  if (remainder === 0n) {
    return quotient;
  }

  const absRemainder = remainder < 0n ? -remainder : remainder;
  const roundAway = absRemainder * 2n >= factor;

  if (!roundAway) {
    return quotient;
  }

  return quotient + (amount >= 0n ? 1n : -1n);
}

function trimFraction(value: string, minimumDigits: number): string {
  if (value.length === 0) {
    return '';
  }

  let end = value.length;

  while (end > minimumDigits && value[end - 1] === '0') {
    end--;
  }

  return value.slice(0, end);
}

function validateStyle(
  style: CurrencyFormatOptions['style'],
): asserts style is NonNullable<CurrencyFormatOptions['style']> {
  if (style !== 'symbol' && style !== 'code') {
    throw new RangeError(`Unsupported currency style: ${String(style)}`);
  }
}

function validateFractionDigits(name: string, value: number | undefined, fallback: number): number {
  if (value == null) {
    return fallback;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }

  return value;
}

function getCurrencyTemplate(
  locale: string,
  currencyCode: string,
  style: NonNullable<CurrencyFormatOptions['style']>,
  isNegative: boolean,
): Intl.NumberFormatPart[] {
  const key = [locale, currencyCode, style, isNegative ? 'neg' : 'pos'].join('\0');
  const cached = currencyTemplateCache.get(key);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat(locale, {
    currency: currencyCode,
    currencyDisplay: style,
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
    style: 'currency',
  });

  const template = formatter.formatToParts(isNegative ? -1.1 : 1.1);

  currencyTemplateCache.set(key, template);

  return template;
}

function getIntegerFormatter(locale: string): Intl.NumberFormat {
  const cached = integerFormatterCache.get(locale);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    useGrouping: true,
  });

  integerFormatterCache.set(locale, formatter);

  return formatter;
}

function pow10(exponent: number): bigint {
  const cached = pow10Cache.get(exponent);

  if (cached != null) {
    return cached;
  }

  const computed = 10n ** BigInt(exponent);

  pow10Cache.set(exponent, computed);

  return computed;
}

function getCurrencyDecimals(currencyCode: string): number {
  if (currencyDecimalsCache.has(currencyCode)) {
    return currencyDecimalsCache.get(currencyCode)!;
  }

  const decimals =
    new Intl.NumberFormat('en', { currency: currencyCode, style: 'currency' }).resolvedOptions()
      .maximumFractionDigits ?? 2;

  currencyDecimalsCache.set(currencyCode, decimals);

  return decimals;
}

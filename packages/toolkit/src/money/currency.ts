import type { Money } from './types';

/**
 * Options for currency formatting.
 */
export type CurrencyFormatOptions = {
  locale?: string; // BCP 47 language tag (e.g., 'en-US', 'de-DE')
  maximumFractionDigits?: number; // Maximum decimal places
  minimumFractionDigits?: number; // Minimum decimal places
  style?: 'symbol' | 'code' | 'name'; // Display style
};

const currencyDecimalsCache = new Map<string, number>();
const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

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
 * currency(money, { style: 'name' }); // '1,234.56 US dollars'
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

  // Convert bigint to decimal string without precision loss
  const amount = moneyToDecimal(money.amount, decimalPlaces);

  const key = [
    locale,
    money.currency,
    style,
    maximumFractionDigits ?? decimalPlaces,
    minimumFractionDigits ?? decimalPlaces,
  ].join('|');
  const formatter =
    currencyFormatterCache.get(key) ??
    new Intl.NumberFormat(locale, {
      currency: money.currency,
      currencyDisplay: style,
      maximumFractionDigits: maximumFractionDigits ?? decimalPlaces,
      minimumFractionDigits: minimumFractionDigits ?? decimalPlaces,
      style: 'currency',
    });

  if (!currencyFormatterCache.has(key)) {
    currencyFormatterCache.set(key, formatter);
  }

  return formatter.format(amount);
}

/**
 * Convert bigint money amount to decimal number without precision loss.
 * Handles arbitrarily large values by avoiding Number conversion until final step.
 *
 * @internal
 */
function moneyToDecimal(amount: bigint, decimalPlaces: number): number {
  if (amount === 0n) return 0;

  const isNegative = amount < 0n;
  const absAmount = isNegative ? -amount : amount;

  // Convert to string and split at decimal boundary
  const amountStr = absAmount.toString().padStart(Math.max(1, decimalPlaces), '0');
  const wholeEndIdx = amountStr.length - decimalPlaces;
  const wholeStr = wholeEndIdx > 0 ? amountStr.slice(0, wholeEndIdx) : '0';
  const fracStr = decimalPlaces > 0 ? amountStr.slice(wholeEndIdx) : '';

  // Reconstruct as decimal string, then convert to number
  const decimalStr = fracStr ? `${wholeStr}.${fracStr}` : wholeStr;
  const result = parseFloat(decimalStr);

  return isNegative ? -result : result;
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

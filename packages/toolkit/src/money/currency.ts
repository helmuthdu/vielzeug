import type { Money } from './types';

/**
 * Options for currency formatting.
 */
export type CurrencyFormatOptions = {
  locale?: string; // BCP 47 language tag (e.g., 'en-US', 'de-DE')
  style?: 'symbol' | 'code' | 'name'; // Display style
  minimumFractionDigits?: number; // Minimum decimal places
  maximumFractionDigits?: number; // Maximum decimal places
};

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
  const { locale = 'en-US', style = 'symbol', minimumFractionDigits, maximumFractionDigits } = options;

  // Get decimal places for currency (default to 2 for most currencies)
  const decimalPlaces = getCurrencyDecimals(money.currency);

  // Convert bigint amount to decimal (divide by 10^decimalPlaces)
  const divisor = 10 ** decimalPlaces;
  const amount = Number(money.amount) / divisor;

  const formatter = new Intl.NumberFormat(locale, {
    currency: money.currency,
    currencyDisplay: style,
    maximumFractionDigits: maximumFractionDigits ?? decimalPlaces,
    minimumFractionDigits: minimumFractionDigits ?? decimalPlaces,
    style: 'currency',
  });

  return formatter.format(amount);
}

function getCurrencyDecimals(currencyCode: string): number {
  return (
    new Intl.NumberFormat('en', { currency: currencyCode, style: 'currency' }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

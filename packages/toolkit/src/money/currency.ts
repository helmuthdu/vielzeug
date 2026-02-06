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

  // Determine Intl.NumberFormat style
  let currencyDisplay: 'symbol' | 'code' | 'name';
  switch (style) {
    case 'symbol':
      currencyDisplay = 'symbol';
      break;
    case 'code':
      currencyDisplay = 'code';
      break;
    case 'name':
      currencyDisplay = 'name';
      break;
    default:
      currencyDisplay = 'symbol';
  }

  const formatter = new Intl.NumberFormat(locale, {
    currency: money.currency,
    currencyDisplay,
    maximumFractionDigits: maximumFractionDigits ?? decimalPlaces,
    minimumFractionDigits: minimumFractionDigits ?? decimalPlaces,
    style: 'currency',
  });

  return formatter.format(amount);
}

/**
 * Gets the number of decimal places for a currency.
 * Most currencies use 2 decimal places, but some use 0 or 3.
 */
function getCurrencyDecimals(currencyCode: string): number {
  const zeroDecimalCurrencies = [
    'BIF',
    'CLP',
    'DJF',
    'GNF',
    'JPY',
    'KMF',
    'KRW',
    'MGA',
    'PYG',
    'RWF',
    'UGX',
    'VND',
    'VUV',
    'XAF',
    'XOF',
    'XPF',
  ];
  const threeDecimalCurrencies = ['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'];

  if (zeroDecimalCurrencies.includes(currencyCode.toUpperCase())) {
    return 0;
  }
  if (threeDecimalCurrencies.includes(currencyCode.toUpperCase())) {
    return 3;
  }
  return 2; // Default for most currencies
}

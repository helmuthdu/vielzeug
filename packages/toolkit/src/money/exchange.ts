import type { Money } from './types';

/**
 * Exchange rate for currency conversion.
 */
export type ExchangeRate = {
  from: string; // Source currency code
  to: string; // Target currency code
  rate: number; // Exchange rate multiplier
};

/**
 * Converts money from one currency to another using the provided exchange rate.
 * Maintains precision by using bigint arithmetic.
 *
 * @example
 * ```ts
 * const usd = { amount: 100000n, currency: 'USD' }; // $1,000.00
 * const rate = { from: 'USD', to: 'EUR', rate: 0.85 };
 *
 * exchange(usd, rate);
 * // { amount: 85000n, currency: 'EUR' } // €850.00
 * ```
 *
 * @param money - Money to convert
 * @param rate - Exchange rate information
 * @returns Converted money in target currency
 * @throws {Error} If source currency doesn't match rate.from
 */
export function exchange(money: Money, rate: ExchangeRate): Money {
  if (money.currency !== rate.from) {
    throw new Error(`Currency mismatch: expected ${rate.from}, got ${money.currency}`);
  }

  // Convert rate to avoid floating point issues
  // Multiply by 1000000 for precision, then divide back
  const rateBigInt = BigInt(Math.round(rate.rate * 1000000));
  const convertedAmount = (money.amount * rateBigInt) / 1000000n;

  return {
    amount: convertedAmount,
    currency: rate.to,
  };
}

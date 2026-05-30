import type { Money } from './types';

/**
 * Exchange rate for currency conversion.
 */
export type ExchangeRate = {
  from: string; // Source currency code
  rate: number; // Exchange rate multiplier
  to: string; // Target currency code
};

/** Precision factor used to convert a floating-point rate to a bigint. 10^10 gives 10 decimal digits. */
const RATE_PRECISION = 10_000_000_000n;
const RATE_PRECISION_NUMBER = Number(RATE_PRECISION);

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

  const rateBigInt = BigInt(Math.round(rate.rate * RATE_PRECISION_NUMBER));
  const convertedAmount = (money.amount * rateBigInt) / RATE_PRECISION;

  return {
    amount: convertedAmount,
    currency: rate.to,
  };
}

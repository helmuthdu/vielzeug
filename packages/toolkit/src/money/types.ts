/**
 * Represents a monetary amount with currency.
 * Amount is stored as bigint (minor units/cents) for precision.
 */
export type Money = {
  readonly amount: bigint; // Amount in minor units (e.g., cents for USD)
  readonly currency: string; // ISO 4217 currency code (e.g., 'USD', 'EUR')
};

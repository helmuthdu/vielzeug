/**
 * Thrown when two `Money` values with different currencies are used in an
 * operation that requires the same currency (e.g. `add`, `compare`, `exchange`).
 *
 * Extends `TypeError` so existing `catch (e) { if (e instanceof TypeError) }` blocks
 * continue to work. Use `instanceof CurrencyMismatchError` for structured handling.
 *
 * @example
 * ```ts
 * import { CurrencyMismatchError } from '@vielzeug/coins';
 *
 * try {
 *   add(usd, eur);
 * } catch (e) {
 *   if (e instanceof CurrencyMismatchError) {
 *     console.log(e.expected, e.received);
 *   }
 * }
 * ```
 */
export class CurrencyMismatchError extends TypeError {
  /** The currency of the first operand. */
  readonly expected: string;
  /** The currency of the second (mismatching) operand. */
  readonly received: string;

  constructor(expected: string, received: string) {
    super(`Currency mismatch: ${expected} and ${received}`);
    this.name = 'CurrencyMismatchError';
    this.expected = expected;
    this.received = received;
  }
}

/**
 * Thrown when an unrecognised ISO 4217 currency code is passed to `money`,
 * `exchange`, or any function that validates a currency string.
 *
 * Extends `RangeError` so existing `catch (e) { if (e instanceof RangeError) }` blocks
 * continue to work. Use `instanceof InvalidCurrencyError` for structured handling.
 *
 * @example
 * ```ts
 * import { InvalidCurrencyError } from '@vielzeug/coins';
 *
 * try {
 *   money('1.00', 'FAKE');
 * } catch (e) {
 *   if (e instanceof InvalidCurrencyError) {
 *     console.log('Bad code:', e.code);
 *   }
 * }
 * ```
 */
export class InvalidCurrencyError extends RangeError {
  /** The unrecognised currency code that was provided. */
  readonly code: string;

  constructor(code: string) {
    super(`Invalid ISO 4217 currency code: "${code}"`);
    this.name = 'InvalidCurrencyError';
    this.code = code;
  }
}

/**
 * Base class for all deposit errors. Catch with `instanceof DepositError` to
 * handle any deposit-originated error regardless of its specific subtype.
 */
export class DepositError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(`[deposit] ${message}`, opts);
    this.name = new.target.name;
    // Ensures `instanceof` works correctly when transpiled to ES5.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when an operation is attempted on a disposed adapter or observer hub. */
export class DepositDisposedError extends DepositError {}

/** Thrown when a `batch()` callback accesses a table not declared in the scope. */
export class DepositScopeError extends DepositError {}

/** Thrown when a WebStorage write exceeds the storage quota. */
export class DepositQuotaError extends DepositError {}

/** Thrown when an IndexedDB `onupgradeneeded` migration callback throws. */
export class DepositMigrationError extends DepositError {}

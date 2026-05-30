/**
 * Base class for all vault errors. Catch with `instanceof VaultError` to
 * handle any vault-originated error regardless of its specific subtype.
 */
export class VaultError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(`[vault] ${message}`, opts);
    this.name = new.target.name;
    // Ensures `instanceof` works correctly when transpiled to ES5.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when an operation is attempted on a disposed adapter or observer hub. */
export class VaultDisposedError extends VaultError {}

/** Thrown when a `batch()` callback accesses a table not declared in the scope. */
export class VaultScopeError extends VaultError {}

/** Thrown when a WebStorage write exceeds the storage quota. */
export class VaultQuotaError extends VaultError {}

/** Thrown when an IndexedDB `onupgradeneeded` migration callback throws. */
export class VaultMigrationError extends VaultError {}

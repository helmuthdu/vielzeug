/**
 * Base class for all vault errors. Catch with `instanceof VaultError` to
 * handle any vault-originated error regardless of its specific subtype.
 */
export class VaultError extends Error {
  protected static readonly errorName: string = 'VaultError';

  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = (new.target as typeof VaultError).errorName;
    // Ensures `instanceof` works correctly when transpiled to ES5.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when an operation is attempted on a disposed adapter or observer hub. */
export class VaultDisposedError extends VaultError {
  protected static override readonly errorName = 'VaultDisposedError';

  constructor(message = 'adapter is disposed', opts?: ErrorOptions) {
    super(message, opts);
  }
}

/** Thrown when a `batch()` callback accesses a table not declared in the scope. */
export class VaultScopeError extends VaultError {
  protected static override readonly errorName = 'VaultScopeError';
}

/** Thrown when a WebStorage write exceeds the storage quota. */
export class VaultQuotaError extends VaultError {
  protected static override readonly errorName = 'VaultQuotaError';
}

/** Thrown when an IndexedDB `onupgradeneeded` migration callback throws. */
export class VaultMigrationError extends VaultError {
  protected static override readonly errorName = 'VaultMigrationError';
}

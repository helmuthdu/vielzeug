/** Base class for all ledger errors. Use `instanceof LedgerError` to catch any ledger-originated error. */
export class LedgerError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a queued operation is cancelled before user code starts, or an active operation cooperatively stops. */
export class LedgerCancelledError extends LedgerError {}

/** Thrown when a method is called on a disposed ledger instance. */
export class LedgerDisposedError extends LedgerError {}

/** Thrown when a command's `apply()` function throws. The original error is available via `.cause`. */
export class LedgerExecutionError extends LedgerError {}

/** Thrown when a command's `revert()` function throws during an undo operation. The original error is available via `.cause`. */
export class LedgerRollbackError extends LedgerError {}

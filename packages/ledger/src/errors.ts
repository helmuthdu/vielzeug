/** Base class for all ledger errors. Use `instanceof LedgerError` to catch any ledger-originated error. */
export class LedgerError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is LedgerError {
    return err instanceof LedgerError;
  }
}

/** Thrown when a method is called on a disposed ledger instance. */
export class LedgerDisposedError extends LedgerError {}

/** Thrown when a command's `execute()` function throws. The original error is available via `.cause`. */
export class LedgerExecutionError extends LedgerError {}

/** Thrown when a command's `rollback()` function throws during an undo operation. The original error is available via `.cause`. */
export class LedgerRollbackError extends LedgerError {}

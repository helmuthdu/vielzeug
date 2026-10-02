/**
 * Base class for all tavern errors.
 * Use `instanceof TavernError` to catch any tavern-originated error in one branch.
 */
export class TavernError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** A pairing code the consumer pasted could not be used — a user-input mistake, not a bug. */
export class TavernPairingError extends TavernError {}

/**
 * Base class for all tandem errors.
 * Use `instanceof TandemError` to catch any tandem-originated error in one branch.
 */
export class TandemError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a disposed sync handle is used again. A scheduler that stops
 * silently is a sync engine's worst failure: the device keeps editing while
 * nothing uploads, and the divergence looks like working software.
 */
export class TandemDisposedError extends TandemError {}

export class RippleError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(error: unknown): error is RippleError {
    return error instanceof RippleError;
  }
}

export class RippleComputedCycleError extends RippleError {}
export class RippleDisposedRuntimeError extends RippleError {}
export class RippleDisposedScopeError extends RippleError {}
export class RippleInfiniteLoopError extends RippleError {}

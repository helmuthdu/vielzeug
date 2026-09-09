export class RippleError extends Error {
  protected static readonly errorName: string = 'RippleError';

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = (new.target as typeof RippleError).errorName;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RippleComputedCycleError extends RippleError {
  protected static override readonly errorName = 'RippleComputedCycleError';
}
export class RippleDisposedResourceError extends RippleError {
  protected static override readonly errorName = 'RippleDisposedResourceError';
}
export class RippleDisposedRuntimeError extends RippleError {
  protected static override readonly errorName = 'RippleDisposedRuntimeError';
}
export class RippleDisposedScopeError extends RippleError {
  protected static override readonly errorName = 'RippleDisposedScopeError';
}
export class RippleInfiniteLoopError extends RippleError {
  protected static override readonly errorName = 'RippleInfiniteLoopError';
}

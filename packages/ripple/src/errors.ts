// ── RippleError ─────────────────────────────────────────────────────────────

/** Base class for all ripple errors. Use `instanceof RippleError` to catch any ripple-originated error. */
export class RippleError extends Error {
  constructor(message = 'an unexpected error occurred', opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is RippleError {
    return err instanceof RippleError;
  }
}

/** Thrown when a computed value reads itself, creating a circular dependency. */
export class RippleComputedCycleError extends RippleError {}

/** Thrown when a method is called on a scope that has already been disposed. */
export class RippleDisposedScopeError extends RippleError {}

/** Thrown when the current runtime environment does not support the requested feature (e.g. SSR APIs in the browser). */
export class RippleEnvironmentError extends RippleError {}

/** Thrown when an effect or flush loop exceeds the maximum iteration count. */
export class RippleInfiniteLoopError extends RippleError {}

/** Thrown when `onCleanup()` is called outside an active effect or scope. */
export class RippleInvalidCleanupError extends RippleError {}

/** Thrown when a store is created or mutated with an invalid value or path. */
export class RippleInvalidStoreError extends RippleError {}

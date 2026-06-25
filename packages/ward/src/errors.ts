/** Base class for all ward errors. Use `instanceof WardError` to catch any ward-originated error. */
export class WardError extends Error {
  constructor(message = 'an unexpected error occurred', opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is WardError {
    return err instanceof WardError;
  }
}

/** Thrown when a rule definition or principal is malformed. */
export class WardConfigError extends WardError {}

/**
 * Thrown when a `when` predicate in a ward rule throws an exception.
 *
 * Catch this to distinguish predicate failures from other errors:
 * ```ts
 * try {
 *   ward.explain(principal, resource, action, data);
 * } catch (e) {
 *   if (e instanceof WardPredicateError) {
 *     console.error(`Predicate in Rule[${e.ruleIndex}] threw`, e.cause);
 *   }
 * }
 * ```
 */
export class WardPredicateError extends WardError {
  readonly ruleIndex: number;

  constructor(ruleIndex: number, cause: unknown) {
    const msg = cause instanceof Error ? cause.message : String(cause);

    super(`Rule[${ruleIndex}] threw: ${msg}`, { cause });
    this.ruleIndex = ruleIndex;
  }
}

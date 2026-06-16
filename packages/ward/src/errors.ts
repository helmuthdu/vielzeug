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
export class WardPredicateError extends Error {
  readonly ruleIndex: number;

  constructor(ruleIndex: number, cause: unknown) {
    const msg = cause instanceof Error ? cause.message : String(cause);

    super(`[ward] Rule[${ruleIndex}] threw: ${msg}`, { cause });

    this.name = 'WardPredicateError';
    this.ruleIndex = ruleIndex;
  }
}

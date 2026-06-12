/**
 * Runs all functions in `fns`, collecting any thrown errors.
 * - With `reverse: true`, iterates in LIFO order (useful for cleanup/teardown stacks).
 * - Throws the single error directly if only one function failed.
 * - Throws an `AggregateError` if multiple functions failed.
 *
 * @example
 * ```ts
 * const cleanups = [() => a.dispose(), () => b.dispose()];
 * runAll(cleanups, { reverse: true });
 *
 * // With context for clearer AggregateError messages:
 * runAll(cleanups, { context: 'my-component', reverse: true });
 * ```
 */
export function runAll(fns: readonly (() => void)[], opts?: { context?: string; reverse?: boolean }): void {
  const errors: unknown[] = [];
  const len = fns.length;

  if (opts?.reverse) {
    for (let i = len - 1; i >= 0; i--) {
      try {
        fns[i]!();
      } catch (err) {
        errors.push(err);
      }
    }
  } else {
    for (const fn of fns) {
      try {
        fn();
      } catch (err) {
        errors.push(err);
      }
    }
  }

  if (errors.length === 1) throw errors[0];

  if (errors.length > 1) {
    const msg = opts?.context ? `[${opts.context}] One or more callbacks failed` : 'One or more callbacks failed';

    throw new AggregateError(errors, msg);
  }
}

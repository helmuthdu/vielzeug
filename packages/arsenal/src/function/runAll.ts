/**
 * Runs all functions in `fns`, collecting any thrown errors.
 * - With `reverse: true`, iterates in LIFO order (useful for cleanup/teardown stacks).
 * - Throws an `AggregateError` containing all failures if any function throws.
 *
 * @example
 * ```ts
 * const cleanups = [() => a.dispose(), () => b.dispose()];
 * runAll(cleanups, { reverse: true });
 * ```
 */
export function runAll(fns: readonly (() => void)[], opts?: { reverse?: boolean }): void {
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

  if (errors.length > 0) {
    throw new AggregateError(errors, 'One or more callbacks failed');
  }
}

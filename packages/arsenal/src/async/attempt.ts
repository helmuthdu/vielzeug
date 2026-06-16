export type AttemptResult<T> =
  | { ok: true; value: T }
  // eslint-disable-next-line perfectionist/sort-object-types
  | { ok: false; error: unknown };

/**
 * Narrows an `AttemptResult` to the success branch.
 * @example
 * ```ts
 * const result = await attempt(() => fetch('/api').then(r => r.json()));
 * if (isOk(result)) console.log(result.value);
 * ```
 */

export function isOk<T>(result: AttemptResult<T>): result is { ok: true; value: T } {
  return result.ok === true;
}

/**
 * Narrows an `AttemptResult` to the failure branch.
 * @example
 * ```ts
 * const result = await attempt(() => fetch('/api').then(r => r.json()));
 * if (isFail(result)) console.error(result.error);
 * ```
 */
// eslint-disable-next-line perfectionist/sort-object-types
export function isFail<T>(result: AttemptResult<T>): result is { ok: false; error: unknown } {
  return result.ok === false;
}

/**
 * Executes a function — sync or async — and returns an `AttemptResult` (or
 * `Promise<AttemptResult>` for async factories). Never throws.
 *
 * TypeScript infers the return type from the factory:
 * - sync factory → `AttemptResult<T>`
 * - async factory → `Promise<AttemptResult<T>>`
 *
 * @example
 * ```ts
 * // Sync
 * const parsed = attempt(() => JSON.parse(rawJson));
 * if (parsed.ok) console.log(parsed.value);
 * else console.error(parsed.error);
 *
 * // Async
 * const result = await attempt(() => fetch('/api').then(r => r.json()));
 * if (result.ok) console.log(result.value);
 * else console.error(result.error);
 *
 * // Combined with retry()
 * const result = await attempt(() => retry(fn, { times: 3 }));
 * ```
 */
export function attempt<T>(fn: () => Promise<T>): Promise<AttemptResult<T>>;
export function attempt<T>(fn: () => T): AttemptResult<T>;
export function attempt<T>(fn: () => T | Promise<T>): AttemptResult<T> | Promise<AttemptResult<T>> {
  try {
    const result = fn();

    if (typeof (result as PromiseLike<T>)?.then === 'function') {
      return (result as Promise<T>).then(
        (value) => ({ ok: true as const, value }),
        (error) => ({ error, ok: false as const }),
      );
    }

    return { ok: true, value: result as T };
  } catch (error) {
    return { error, ok: false };
  }
}

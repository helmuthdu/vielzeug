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
 * Executes a function — sync or async — and resolves to an `AttemptResult`.
 * Never throws.
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
export async function attempt<T>(fn: () => T | Promise<T>): Promise<AttemptResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    return { error, ok: false };
  }
}

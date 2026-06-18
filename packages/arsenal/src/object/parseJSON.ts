import { isNil } from '../guards/isNil';

export type ParseJSONOptions<T> = {
  fallback?: T;
  reviver?: (key: string, value: unknown) => unknown;
  validator?: (parsed: unknown) => boolean;
};

/**
 * Parses a JSON string and returns the resulting value.
 * `null` and `undefined` inputs return `fallback` without throwing.
 *
 * @example
 * ```ts
 * parseJSON<Record<string, number>>('{"a":1}'); // { a: 1 }
 * parseJSON('bad json', { fallback: {} }); // {}
 * parseJSON(null, { fallback: 0 }); // 0
 *
 * // With a validator — returns fallback when validation fails
 * parseJSON('{"id":"bad"}', {
 *   validator: (v) => typeof (v as Record<string, unknown>).id === 'number',
 *   fallback: { id: 0 },
 * }); // { id: 0 }
 * ```
 *
 * @template T - The expected type of the parsed JSON.
 * @param json - The JSON string to parse. `null` / `undefined` return `fallback`.
 * @param [options.fallback] - Value to return when parsing fails, input is nullish, or validation fails.
 * @param [options.reviver] - Optional reviver function for `JSON.parse`.
 * @param [options.validator] - Optional predicate; if it returns `false`, `fallback` is returned.
 *
 * @returns The parsed value, or `fallback` on failure.
 */
export function parseJSON<T = unknown>(
  json: string | null | undefined,
  options: ParseJSONOptions<T> = {},
): T | undefined {
  const { fallback, reviver, validator } = options;

  if (isNil(json)) return fallback;

  try {
    const value = JSON.parse(json, reviver as Parameters<typeof JSON.parse>[1]) as unknown;

    if (value === undefined) return fallback;

    if (validator && !validator(value)) return fallback;

    return value as T | undefined;
  } catch {
    return fallback;
  }
}

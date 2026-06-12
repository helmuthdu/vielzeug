import { isNil } from '../typed/isNil';

export type ParseJSONOptions<T> = {
  defaultValue?: T;
  reviver?: (key: string, value: unknown) => unknown;
  validator?: (parsed: unknown) => boolean;
};

/**
 * Parses a JSON string and returns the resulting value.
 * `null` and `undefined` inputs return the default value without throwing.
 *
 * @example
 * ```ts
 * parseJSON<Record<string, number>>('{"a":1}'); // { a: 1 }
 * parseJSON('bad json', { defaultValue: {} }); // {}
 * parseJSON(null, { defaultValue: 0 }); // 0
 *
 * // With a validator — returns defaultValue when validation fails
 * parseJSON('{"id":"bad"}', {
 *   validator: (v) => typeof (v as Record<string, unknown>).id === 'number',
 *   defaultValue: { id: 0 },
 * }); // { id: 0 }
 * ```
 *
 * @template T - The expected type of the parsed JSON.
 * @param json - The JSON string to parse. `null` / `undefined` return `defaultValue`.
 * @param [options.defaultValue] - Value to return when parsing fails, input is nullish, or validation fails.
 * @param [options.reviver] - Optional reviver function for `JSON.parse`.
 * @param [options.validator] - Optional predicate; if it returns `false`, `defaultValue` is returned.
 *
 * @returns The parsed value, or `defaultValue` on failure.
 */
export function parseJSON<T = unknown>(
  json: string | null | undefined,
  options: ParseJSONOptions<T> = {},
): T | undefined {
  const { defaultValue, reviver, validator } = options;

  if (isNil(json)) return defaultValue;

  try {
    const value = JSON.parse(json, reviver as Parameters<typeof JSON.parse>[1]) as unknown;

    if (value === undefined) return defaultValue;

    if (validator && !validator(value)) return defaultValue;

    return value as T | undefined;
  } catch {
    return defaultValue;
  }
}

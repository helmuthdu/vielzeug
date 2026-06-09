import { isNil } from '../typed/isNil';

type ParseJSONOptions<T> = {
  defaultValue?: T;
  reviver?: (key: string, value: unknown) => unknown;
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
 * ```
 *
 * @template T - The expected type of the parsed JSON.
 * @param json - The JSON string to parse. `null` / `undefined` return `defaultValue`.
 * @param [options.defaultValue] - Value to return when parsing fails or input is nullish.
 * @param [options.reviver] - Optional reviver function for `JSON.parse`.
 *
 * @returns The parsed value, or `defaultValue` on failure.
 */
export function parseJSON<T = unknown>(
  json: string | null | undefined,
  options: ParseJSONOptions<T> = {},
): T | undefined {
  const { defaultValue, reviver } = options;

  if (isNil(json)) return defaultValue;

  try {
    const value = JSON.parse(json, reviver as Parameters<typeof JSON.parse>[1]) as unknown;

    return (value === undefined ? defaultValue : value) as T | undefined;
  } catch {
    return defaultValue;
  }
}

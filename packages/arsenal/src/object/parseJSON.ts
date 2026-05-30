import { isNil } from '../typed/isNil';

type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };

// #region ParseJSONOptions
type ParseJSONOptions<T> = {
  defaultValue?: T;
  onError?: (err: unknown) => void;
  reviver?: (key: string, value: any) => any;
  validator?: (value: any) => boolean;
};
// #endregion ParseJSONOptions

/**
 * Parses a JSON string and returns the resulting object.
 * `null` and `undefined` inputs return the default value.
 *
 * @example
 * ```ts
 * const json = '{"a":1,"b":2,"c":3}';
 * const result = parseJSON<Record<string, number>>(json, {
 *   defaultValue: { a: 0, b: 0, c: 0 },
 *   validator: (value) => Object.values(value).every(v => typeof v === 'number'),
 *   onError: (err) => console.warn('Parsing failed:', err),
 * });
 * console.log(result); // { a: 1, b: 2, c: 3 }
 *
 * // With fallback for invalid input
 * parseJSON('bad json', { defaultValue: {} }); // {}
 * ```
 *
 * @template T - The expected type of the parsed JSON.
 * @param json - The JSON string to parse. `null` / `undefined` return `defaultValue`.
 * @param options - Configuration options for parsing.
 * @param options.defaultValue - Value to return if parsing fails or input is nullish.
 * @param options.validator - Optional predicate to validate the parsed result.
 * @param options.reviver - Optional reviver function for JSON.parse.
 * @param options.onError - Optional callback for error handling.
 *
 * @returns The parsed value, or `defaultValue` on failure.
 */
export function parseJSON<T extends JSONValue>(
  json: string | null | undefined,
  options: ParseJSONOptions<T> = {},
): T | undefined {
  const { defaultValue, onError, reviver, validator } = options;

  if (isNil(json)) return defaultValue;

  try {
    const value = JSON.parse(json, reviver);

    if (validator && !validator(value)) {
      throw new TypeError('Parsed value does not match the expected structure');
    }

    return (value ?? defaultValue) as T | undefined;
  } catch (err) {
    onError?.(err);

    return defaultValue;
  }
}

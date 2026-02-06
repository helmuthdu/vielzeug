import { Logit } from '@vielzeug/logit';
import { isNil } from '../typed/isNil';
import { isString } from '../typed/isString';

type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };

// #region ParseJSONOptions
type ParseJSONOptions<T> = {
  defaultValue?: T;
  // biome-ignore lint/suspicious/noExplicitAny: -
  reviver?: (key: string, value: any) => any;
  // biome-ignore lint/suspicious/noExplicitAny: -
  validator?: (value: any) => boolean;
  silent?: boolean;
};
// #endregion ParseJSONOptions

/**
 * Parses a JSON string and returns the resulting object.
 *
 * @example
 * ```ts
 * const json = '{"a":1,"b":2,"c":3}';
 * const result = parseJSON<Record<string, number>>(json, {
 *   defaultValue: { a: 0, b: 0, c: 0 },
 *   validator: (value) => Object.values(value).every(v => typeof v === 'number'),
 *   errorHandler: (err) => console.warn('Parsing failed:', err.message),
 *   silent: true
 * });
 * console.log(result); // { a: 1, b: 2, c: 3 }
 * ```
 *
 * @template T - The expected type of the parsed JSON.
 * @param json - The JSON string to parse. If not a string, it is returned as is.
 * @param options - Configuration options for parsing.
 *
 * @returns The parsed object if successful, otherwise the default value.
 */
export function parseJSON<T extends JSONValue>(json: unknown, options: ParseJSONOptions<T> = {}): T | undefined {
  const { defaultValue, reviver, validator, silent = false } = options;

  if (!isString(json)) return isNil(json) ? defaultValue : (json as T);

  try {
    const parsed = JSON.parse(json as string, reviver);

    if (validator && !validator(parsed)) {
      throw new TypeError('Parsed JSON does not match the expected structure');
    }

    return parsed ?? defaultValue;
  } catch (err) {
    if (!silent) {
      Logit.error('parseJSON() -> failed to parse object', err);
    }

    return defaultValue;
  }
}

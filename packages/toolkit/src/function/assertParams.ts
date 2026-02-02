import { assert } from './assert';

/**
 * Asserts that the specified keys are present in the params object and are not empty strings.
 *
 * @example
 * ```ts
 * const params = { id: '123', name: '' };
 * assertParams(params, ['id']); // Does nothing
 * assertParams(params, ['id', 'name'], 'UserUpdate'); // Throws: Missing required parameter: "name" in "UserUpdate"
 * ```
 *
 * @param params - The object containing the parameters to check.
 * @param keys - An array of keys that must be present and non-empty in the params object.
 * @param [name] - An optional name for the context of the assertion (e.g., function name).
 * @param [options] - Assertion options.
 * @param [options.type] - The error class to throw (default: `Error`).
 * @param [options.bypass] - If `true`, logs a warning instead of throwing an error.
 *
 * @throws {Error} If any of the required keys are missing or are empty strings.
 */
export function assertParams<T extends object, K extends keyof T>(
  params: T,
  keys: K[],
  name?: string,
  options: { type?: ErrorConstructor; bypass?: boolean } = {},
): asserts params is T & Required<Pick<T, K>> {
  assert(!!params, 'Missing parameters object', options);

  const missing = keys.filter((key) => params[key] === undefined || params[key] === null || params[key] === '');

  if (missing.length > 0) {
    const context = name ? ` in "${name}"` : '';
    const keysStr = missing.map((key) => `"${String(key)}"`).join(', ');
    const message = `Missing required parameter${missing.length > 1 ? 's' : ''}: ${keysStr}${context}`;

    assert(false, message, options);
  }
}

import { normalizeCase } from './_caseUtils';

/**
 * Converts a string to snake case.
 *
 * @example
 * ```ts
 * const text = 'Hello World';
 * snakeCase(text) // 'hello_world';
 * ```
 *
 * @param str - The string to convert.
 *
 * @returns The converted string.
 */
export function snakeCase(str: string): string {
  return normalizeCase(str, '_').toLowerCase();
}

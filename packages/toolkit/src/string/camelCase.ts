import { normalizeCase } from './_caseUtils';

/**
 * Converts a string to camel case.
 *
 * @example
 * ```ts
 * const text = 'hello world';
 * camelCase(text); // 'helloWorld'
 * ```
 *
 * @param str - The string to convert.
 * @returns The converted string.
 */
export function camelCase(str: string): string {
  return normalizeCase(str, ' ')
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase()) // Basic split by non-alphanumeric
    .replace(/^./, (char) => char.toLowerCase());
}

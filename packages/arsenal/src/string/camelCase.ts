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
    .replace(/[^\p{L}\p{N}]+(.)/gu, (_, char) => char.toUpperCase())
    .replace(/^./, (char) => char.toLowerCase());
}

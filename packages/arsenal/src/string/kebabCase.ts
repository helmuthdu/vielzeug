import { normalizeCase } from './_caseUtils';

/**
 * Converts a string to kebab case.
 *
 * @example
 * ```ts
 * const text = 'Hello World';
 * kebabCase(text); // 'hello-world'
 * ```
 *
 * @param str - The string to convert.
 *
 * @returns The converted string.
 */
export function kebabCase(str: string): string {
  return normalizeCase(str, '-').toLowerCase();
}

import { normalizeCase } from './_caseUtils';

/**
 * Converts a string to Pascal case.
 *
 * @example
 * ```ts
 * const text = 'Hello World';
 * pascalCase(text) // 'HelloWorld';
 * ```
 *
 * @param str - The string to convert.
 *
 * @returns The converted string.
 */
export function pascalCase(str: string): string {
  return normalizeCase(str, ' ')
    .replace(/(?:^|\s)(\w)/g, (_, char) => char.toUpperCase())
    .replace(/\s+/g, '');
}

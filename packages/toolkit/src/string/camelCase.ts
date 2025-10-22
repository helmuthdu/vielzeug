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
  return str
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^./, (char) => char.toLowerCase());
}

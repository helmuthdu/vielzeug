/**
 * Converts a string to snake case.
 *
 * @example
 * ```ts
 * const text = 'Hello World';
 * toSnakeCase(text) // 'hello_world';
 * ```
 *
 * @param str - The string to convert.
 *
 * @returns The converted string.
 */
export function snakeCase(str: string): string {
  return str
    .trim()
    .replace(/([a-z])([A-Z\d])|([A-Z\d])([A-Z][a-z])|(\d)([a-zA-Z])/g, '$1$3$5_$2$4$6')
    .replace(/[^a-z\d]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

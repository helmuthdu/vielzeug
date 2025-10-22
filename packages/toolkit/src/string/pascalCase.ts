/**
 * Converts a string to snake case.
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
  return str
    .replace(/([a-z])([A-Z\d])|([A-Z\d])([A-Z][a-z])|(\d)([a-zA-Z])/g, '$1$3$5 $2$4$6')
    .replace(/[^a-z\d]+/gi, ' ')
    .replace(/(?:^|\s)(\w)/g, (_, char) => char.toUpperCase())
    .trim();
}

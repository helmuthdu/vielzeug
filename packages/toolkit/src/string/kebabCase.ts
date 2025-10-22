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
  return str
    .trim()
    .replace(/([a-z])([A-Z\d])|([A-Z\d])([A-Z][a-z])|(\d)([a-zA-Z])/g, '$1$3$5-$2$4$6')
    .replace(/[^a-z\d]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

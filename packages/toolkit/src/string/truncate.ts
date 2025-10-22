/**
 * Truncates a string if it is longer than the given maximum string length. The last characters of the truncated string are replaced with the ellipsis sign "…".
 *
 * @example
 * ```ts
 * const text = 'Hello World';
 * truncate(text, 5); // 'Hello…'
 * truncate(text, 3, true); // 'Hello…'
 * truncate(text, 5, true, '...'); // 'Hello...'
 * ```
 *
 * @param str - The string to truncate.
 * @param limit - The maximum string length.
 * @param completeWords - If true, the string is truncated to the nearest word, instead of character.
 * @param ellipsis - The characters to end the truncated string with.
 *
 * @returns The truncated string.
 */
export function truncate(str: string, limit = 25, completeWords = false, ellipsis = '…'): string {
  const _limit = completeWords ? str.substring(0, limit).lastIndexOf(' ') : limit;

  return str.length > _limit ? `${str.substring(0, _limit).trim()}${ellipsis}` : str;
}

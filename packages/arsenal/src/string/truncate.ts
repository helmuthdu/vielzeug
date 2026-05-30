type TruncateOptions = {
  completeWords?: boolean;
  ellipsis?: string;
};

/**
 * Truncates a string if it is longer than the given maximum string length. The last characters of the truncated string are replaced with the ellipsis sign "…".
 *
 * @example
 * ```ts
 * const text = 'Hello World';
 * truncate(text, 5); // 'Hello…'
 * truncate(text, 8, { completeWords: true }); // 'Hello…'
 * truncate(text, 5, { ellipsis: '...' }); // 'Hello...'
 * ```
 *
 * @param str - The string to truncate.
 * @param limit - The maximum string length.
 * @param options - Options for truncation.
 * @param [options.completeWords] - If true, truncate to the nearest word boundary.
 * @param [options.ellipsis] - Suffix appended after truncation (default: '…').
 *
 * @returns The truncated string.
 *
 * @throws {TypeError} If str is not a string or limit is not a positive number.
 */
export function truncate(
  str: string,
  limit = 25,
  { completeWords = false, ellipsis = '…' }: TruncateOptions = {},
): string {
  if (str.length <= limit) {
    return str;
  }

  let end = limit;

  if (completeWords) {
    const wordEnd = str.substring(0, limit).lastIndexOf(' ');

    if (wordEnd > 0) end = wordEnd;
  }

  return `${str.substring(0, end).trim()}${ellipsis}`;
}

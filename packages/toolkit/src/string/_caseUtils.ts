/**
 * Shared regex pattern for splitting words in case conversion utilities
 */
export const CASE_SPLIT_PATTERN = /([a-z])([A-Z\d])|([A-Z\d])([A-Z][a-z])|(\d)([a-zA-Z])/g;

/**
 * Normalizes a string by splitting on word boundaries and removing special characters
 *
 * @param str - The string to normalize
 * @param separator - The separator to use for splitting (default: space)
 * @returns The normalized string
 */
export function normalizeCase(str: string, separator = ' '): string {
  return str
    .trim()
    .replace(CASE_SPLIT_PATTERN, `$1$3$5${separator}$2$4$6`)
    .replace(/[^a-z\d]+/gi, separator)
    .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');
}

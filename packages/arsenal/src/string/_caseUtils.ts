/**
 * Shared regex pattern for splitting words in case conversion utilities.
 * Module-private (underscore-prefixed file is not barrel-exported).
 * Used only with String.prototype.replace — which always resets lastIndex.
 */
const CASE_SPLIT_PATTERN = /([a-z])([A-Z\d])|([A-Z\d])([A-Z][a-z])|(\d)([a-zA-Z])/g;

/** Escapes all regex metacharacters in a string (per MDN spec). */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
}

/**
 * Normalizes a string by splitting on word boundaries and removing special characters
 *
 * @param str - The string to normalize
 * @param separator - The separator to use for splitting (default: space)
 * @returns The normalized string
 */
export function normalizeCase(str: string, separator = ' '): string {
  const escapedSep = escapeRegex(separator);

  return str
    .trim()
    .replace(CASE_SPLIT_PATTERN, `$1$3$5${separator}$2$4$6`)
    .replace(/[^a-z\d]+/gi, separator)
    .replace(new RegExp(`^(?:${escapedSep})+|(?:${escapedSep})+$`, 'g'), '');
}

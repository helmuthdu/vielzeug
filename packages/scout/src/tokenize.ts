/**
 * Normalizes a string for indexing or querying.
 * Lowercases, replaces punctuation (except apostrophes) with spaces,
 * trims, and collapses runs of whitespace to a single space.
 * @internal
 */
export function tokenize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Converts an unknown field value to an indexable string.
 * Returns an empty string for `null`, `undefined`, objects, or symbols.
 * Arrays are joined with a space after filtering to string/number/boolean elements.
 * @internal
 */
export function defaultStringify(value: unknown): string {
  if (value == null) return '';

  if (typeof value === 'string') return value;

  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean').join(' ');
  }

  return '';
}

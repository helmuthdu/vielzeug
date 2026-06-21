import { warn } from './_warn';

/**
 * Normalizes a string for indexing or querying.
 * Lowercases, replaces punctuation (except apostrophes) with spaces,
 * trims, and collapses runs of whitespace to a single space.
 * @internal
 */
export function tokenize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s']/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Converts an unknown field value to an indexable string.
 * Returns an empty string for `null`, `undefined`, objects, or symbols.
 * @internal
 */
export function defaultStringify(value: unknown): string {
  if (value == null) return '';

  if (typeof value === 'string') return value;

  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    warn(
      'defaultStringify: received an array value — provide a custom `stringify` on the FieldDef to control array indexing.\n' +
        'Falling back to joining string/number/boolean elements with a space.',
    );

    return (value as unknown[])
      .filter((v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
      .join(' ');
  }

  return '';
}

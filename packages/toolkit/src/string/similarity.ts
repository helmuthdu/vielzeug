import { assert } from '../function/assert';

/**
 * Calculate the similarity between two strings using the Levenshtein distance algorithm.
 *
 * @example
 * ```ts
 * similarity('abc', 'abc') // 1
 * similarity('a', 'b') // 0
 * similarity('ab', 'ac') // 0.5
 * similarity('doe', 'John Doe') // 0.25
 * similarity('abc', 'axc') // 0.6666666666666667
 * similarity('kitten', 'sitting') // 0.5714285714285714
 * ```
 *
 * @param str1 - The first string.
 * @param str2 - The second string.
 *
 * @returns A number between 0 and 1 representing the similarity between the two strings.
 */
export function similarity(str1: unknown, str2: unknown): number {
  assert(
    ['string', 'number'].includes(typeof str1) && ['string', 'number'].includes(typeof str2),
    'Invalid arguments',
    {
      args: { str1, str2 },
      type: TypeError,
    },
  );

  const a = String(str1).toLowerCase();
  const b = String(str2).toLowerCase();
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const aLength = a.length;
  const bLength = b.length;
  const matrix = Array.from({ length: aLength + 1 }, (_, i) =>
    Array.from({ length: bLength + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i <= aLength; i++) {
    for (let j = 1; j <= bLength; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  const distance = matrix[aLength][bLength];

  return 1 - distance / Math.max(aLength, bLength);
}

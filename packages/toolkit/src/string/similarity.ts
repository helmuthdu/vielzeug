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
  if (a.length === 0) return b.length === 0 ? 1 : 0;
  if (b.length === 0) return 0;

  // Swap to ensure we use the smaller string for columns (O(min(A,B)) space)
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  const shorterLength = shorter.length;
  const longerLength = longer.length;

  let prevRow = Array.from({ length: shorterLength + 1 }, (_, i) => i);
  let currRow = new Array(shorterLength + 1);

  for (let i = 1; i <= longerLength; i++) {
    currRow[0] = i;
    for (let j = 1; j <= shorterLength; j++) {
      const cost = longer[i - 1] === shorter[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1, // insertion
        prevRow[j] + 1, // deletion
        prevRow[j - 1] + cost, // substitution
      );
    }
    // Swap rows for the next iteration (avoid allocation)
    [prevRow, currRow] = [currRow, prevRow];
  }

  // After the loop, a result is in prevRow because of the swap
  const distance = prevRow[shorterLength];

  return 1 - distance / Math.max(a.length, b.length);
}

/**
 * Generates padded trigrams from a pre-normalized (lowercased, trimmed) string.
 *
 * The string is padded with a single leading and trailing space so that prefix
 * and suffix characters form complete trigrams.
 *
 * @example
 * `"hello"` → `{ " he", "hel", "ell", "llo", "lo " }`
 *
 * @internal
 */
export function generateTrigrams(text: string): Set<string> {
  const trigrams = new Set<string>();
  const padded = ` ${text} `;

  for (let i = 0; i < padded.length - 2; i++) {
    trigrams.add(padded.slice(i, i + 3));
  }

  return trigrams;
}

/**
 * Computes the Sørensen–Dice coefficient between two trigram sets.
 * Returns `0` when either set is empty; `1` when sets are identical.
 *
 * Formula: `2 * |A ∩ B| / (|A| + |B|)`
 *
 * @internal
 */
export function diceSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;

  let shared = 0;

  for (const trigram of a) {
    if (b.has(trigram)) shared++;
  }

  return (2 * shared) / (a.size + b.size);
}

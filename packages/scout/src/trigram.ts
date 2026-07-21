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
 * Computes the Szymkiewicz–Simpson overlap coefficient between two trigram sets.
 * Returns `0` when either set is empty; `1` when the smaller set is fully contained in the
 * larger one (including when the sets are identical).
 *
 * Formula: `|A ∩ B| / min(|A|, |B|)`
 *
 * Deliberately *not* the more common Sørensen–Dice coefficient (`2·|A∩B| / (|A|+|B|)`): Dice's
 * denominator grows with the *combined* size of both sets, so a short query fully contained in a
 * much longer target field is unfairly penalized purely for the target's length — e.g. querying
 * `"fin"` against a field containing `"finalize project budget"` shares 2 of the query's 3
 * trigrams under Dice (`2·2/(3+~24) ≈ 0.15`, likely below a typical `0.2` threshold) even though
 * the query is a clean prefix match. The overlap coefficient instead asks "what fraction of the
 * *smaller* set (almost always the query, for autocomplete/command-palette use) was found?" —
 * the same example scores `2/min(3,~24) ≈ 0.67`. Overlap is always `>= Dice` for the same inputs
 * (by the AM ≥ min inequality), so this can only ever include *more* legitimate matches, never
 * fewer, than the previous Dice-based scoring.
 *
 * @internal
 */
export function overlapSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;

  let shared = 0;

  for (const trigram of a) {
    if (b.has(trigram)) shared++;
  }

  return shared / Math.min(a.size, b.size);
}

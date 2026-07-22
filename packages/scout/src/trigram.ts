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
 * A single shared trigram is treated as `0` (no match), not folded into the ratio above — for
 * any query of 4+ characters (the overwhelmingly common case: `generateTrigrams` yields
 * `length + 1` trigrams once padded), one incidental boundary trigram already clears the
 * `min(|A|,|B|) `-based ratio far enough to pass the library's own default `threshold` (`0.2`,
 * `1/4`), regardless of how unrelated the two strings actually are — e.g. `"x300"` and `"a200"`
 * share nothing but the trailing `"00 "` boundary trigram (both end in a round hundred) yet
 * would otherwise score `0.25`. A real fuzzy/typo match almost always shares *several*
 * consecutive trigrams, not one; requiring `>= 2` (or a full match, for the rare query short
 * enough to normalize to a single trigram) filters out this class of false positive without
 * weakening genuine partial matches — see `scout-index.ts`'s `search()` tests for both cases.
 *
 * @internal
 */
export function overlapSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;

  let shared = 0;

  for (const trigram of a) {
    if (b.has(trigram)) shared++;
  }

  if (shared < 2 && shared < a.size) return 0;

  return shared / Math.min(a.size, b.size);
}

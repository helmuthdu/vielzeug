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
 * Scores how much of the *query*'s trigrams were found in a *field*: `|query ∩ field| / |query|`.
 * Returns `0` when either set is empty; `1` when every query trigram appears in the field.
 *
 * Deliberately *not* the Szymkiewicz–Simpson overlap coefficient (`|A ∩ B| / min(|A|, |B|)`):
 * dividing by the *smaller* set scores any field that is fully contained in the query at a
 * perfect `1.0`, however short it is. That assumption ("the smaller set is the query") holds
 * for single-word autocomplete but fails constantly for multi-word queries and short fields:
 * the query `"tomato soup recipe"` would return the field `"Tom"` at `0.67`, and `"alice smith"`
 * would return a bare first name `"Alice"` at `1.0`. Coverage asks "what fraction of what the
 * user typed was found in this field?", which is the question a search threshold should gate:
 * the same `"tomato soup recipe"` vs `"Tom"` scores `2/20 = 0.1` (below the default `0.2`
 * threshold), while the clean 3-character prefix `"fin"` against `"finalize project budget"`
 * still scores `2/3 ≈ 0.67` because nearly the whole query was found.
 *
 * A single shared trigram is treated as `0` (no match), not folded into the ratio above: for
 * any query of 4+ characters (the overwhelmingly common case: `generateTrigrams` yields
 * `length + 1` trigrams once padded), one incidental boundary trigram already clears the
 * default `threshold` (`0.2`) on short queries, regardless of how unrelated the two strings
 * actually are: e.g. `"x300"` and `"a200"` share nothing but the trailing `"00 "` boundary
 * trigram (both end in a round hundred) yet would otherwise score `1/3`. A real fuzzy/typo
 * match almost always shares *several* consecutive trigrams, not one; requiring `>= 2` (or a
 * full match, for the rare query short enough to normalize to a single trigram) filters out
 * this class of false positive without weakening genuine partial matches: see `scout-index.ts`'s
 * `search()` tests for both cases.
 *
 * @internal
 */
export function queryCoverage(query: Set<string>, field: Set<string>): number {
  if (query.size === 0 || field.size === 0) return 0;

  let shared = 0;

  for (const trigram of query) {
    if (field.has(trigram)) shared++;
  }

  if (shared < 2 && shared < query.size) return 0;

  return shared / query.size;
}

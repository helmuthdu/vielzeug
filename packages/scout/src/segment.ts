/**
 * Splits `text` into whitespace-joined word segments using the runtime's native
 * `Intl.Segmenter` — no dependency, no bundle cost beyond this file.
 *
 * `tokenize()`'s trigram-based scoring works on unsegmented scripts (Chinese, Japanese,
 * Thai, ...) without this — trigrams are generated per-character, not per-word — but
 * `findMatchRanges()` / highlighting and the multi-word query semantics documented on
 * `SearchConstraints` assume space-separated words. Corpora in those scripts benefit from
 * pre-segmenting via a custom `stringify` so word boundaries exist for those features too.
 *
 * Not applied inside `tokenize()` itself: benchmarked at ~15x slower than the plain regex
 * path for the common whitespace-delimited case, which would regress `createIndex()`'s
 * O(corpus × field_length) construction cost for every caller, not just those indexing
 * unsegmented scripts. Opt in per-field instead.
 *
 * Returns `text` unchanged where `Intl.Segmenter` isn't available in the current runtime.
 *
 * @example
 * ```ts
 * const index = createIndex(documents, {
 *   fields: [{ field: 'title', stringify: (v) => segmentWords(String(v)) }],
 * });
 * ```
 */
export function segmentWords(text: string): string {
  const segmenter = getSegmenter();

  if (!segmenter) return text;

  return [...segmenter.segment(text)]
    .filter((segment) => segment.isWordLike)
    .map((segment) => segment.segment)
    .join(' ');
}

// Constructing an `Intl.Segmenter` costs roughly as much as a `segment()` call itself
// (both are called from `stringify`, once per field per item during `createIndex()`) — cache
// the single stateless instance instead of rebuilding it on every `segmentWords()` call.
let cachedSegmenter: Intl.Segmenter | null | undefined;

function getSegmenter(): Intl.Segmenter | null {
  if (cachedSegmenter === undefined) {
    cachedSegmenter =
      typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function'
        ? null
        : new Intl.Segmenter(undefined, { granularity: 'word' });
  }

  return cachedSegmenter;
}

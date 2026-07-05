import type { HighlightPart, SearchResult } from './types';

/**
 * Finds character ranges within `text` where `query` words appear.
 * Ranges are sorted and overlapping ranges are merged.
 *
 * Useful when you need to apply match ranges to a different string than the
 * indexed field value (e.g. a truncated preview or a differently formatted display string).
 *
 * @param text - The string to search within.
 * @param query - The normalized (tokenized) query string. Words are split on spaces.
 * @returns Sorted, non-overlapping `[start, end]` character ranges.
 */
export function findMatchRanges(text: string, query: string): [number, number][] {
  const lower = text.toLowerCase();
  const words = query.split(' ').filter(Boolean);
  const ranges: [number, number][] = [];

  for (const word of words) {
    let pos = 0;

    while (pos < lower.length) {
      const idx = lower.indexOf(word, pos);

      if (idx === -1) break;

      ranges.push([idx, idx + word.length]);
      pos = idx + 1;
    }
  }

  ranges.sort((a, b) => a[0] - b[0]);

  const merged: [number, number][] = [];

  for (const range of ranges) {
    const last = merged[merged.length - 1];

    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push([range[0], range[1]]);
    }
  }

  return merged;
}

/**
 * Splits `text` into highlighted and unhighlighted fragments using match `ranges`.
 *
 * Ranges must be sorted and non-overlapping (as produced by `SearchResult.matches[n].ranges`).
 * Use the returned parts to render highlighted text in a UI component.
 *
 * **`part.text` is the original, unescaped field value** (e.g. a user's name, bio, or
 * product title) — this function does no HTML escaping. Render each part via safe DOM APIs
 * (`textContent`, a framework's text binding) and wrap `highlighted` parts in your own
 * element (e.g. `<mark>`); never concatenate `part.text` into an HTML string for
 * `innerHTML` — that reintroduces the XSS risk this structured return shape avoids.
 *
 * @example
 * ```ts
 * highlight('Hello World', [[0, 5]]);
 * // [{ text: 'Hello', highlighted: true }, { text: ' World', highlighted: false }]
 *
 * highlight('Hello World', [[0, 5], [6, 11]]);
 * // [
 * //   { text: 'Hello', highlighted: true },
 * //   { text: ' ',     highlighted: false },
 * //   { text: 'World', highlighted: true },
 * // ]
 * ```
 *
 * @param text - The original field value to split.
 * @param ranges - Sorted, non-overlapping `[start, end]` ranges from `FieldMatch.ranges`.
 * @returns An array of `HighlightPart` objects. Returns an empty array for an empty `text`.
 */
export function highlight(text: string, ranges: [number, number][]): HighlightPart[] {
  if (!text) return [];

  if (!ranges.length) return [{ highlighted: false, text }];

  const parts: HighlightPart[] = [];
  let cursor = 0;

  for (const [start, end] of ranges) {
    if (start > cursor) {
      parts.push({ highlighted: false, text: text.slice(cursor, start) });
    }

    if (end > start) {
      parts.push({ highlighted: true, text: text.slice(start, end) });
    }

    cursor = end;
  }

  if (cursor < text.length) {
    parts.push({ highlighted: false, text: text.slice(cursor) });
  }

  return parts;
}

/**
 * Finds the match ranges for `field` in `result` and splits `text` into
 * highlighted and unhighlighted fragments in one step.
 *
 * This is the ergonomic shorthand for the common pattern:
 * ```ts
 * const match = result.matches.find(m => m.field === 'name');
 * const parts = highlight(item.name, match?.ranges ?? []);
 * ```
 *
 * @example
 * ```ts
 * for (const result of index.search('alice')) {
 *   const parts = highlightField(result, 'name', result.item.name);
 *   console.log(parts.map(p => p.highlighted ? `[${p.text}]` : p.text).join(''));
 * }
 * ```
 *
 * @param result - A `SearchResult` from `ScoutIndex.search()`.
 * @param field - The field name to look up in `result.matches`.
 * @param text - The original field value string to split.
 * @returns An array of `HighlightPart` objects.
 */
export function highlightField<T>(result: SearchResult<T>, field: keyof T & string, text: string): HighlightPart[] {
  const match = result.matches.find((m) => m.field === field);

  return highlight(text, match?.ranges ?? []);
}

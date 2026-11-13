/** Normalized form of a string plus the map back to the original. */
export type Normalized = {
  /** `offsets[i]` is the index in the original where normalized character `i` came from. */
  readonly offsets: number[];
  readonly text: string;
};

const WORD_CHAR_RE = /[\p{L}\p{N}\p{M}'’]/u;
const MARK_START_RE = /^\p{M}/u;
const MARK_RE = /\p{M}/u;
const LATIN_RE = /\p{Script=Latin}/u;
const LATIN_ACCENT_RE = /[\u0300-\u036f]/u;

/**
 * One normalization for indexing, matching, and highlighting.
 *
 * Walks the string in combining-mark clusters (base code point plus its trailing `\p{M}` marks):
 *
 * 1. Unicode lowercasing. A multi-unit expansion (as with `İ` → `i` + U+0307) keeps every
 *    output unit mapped to the same source index.
 * 2. Latin-only accent folding: when the cluster's base is Latin, combining marks in
 *    U+0300–U+036F are dropped — both precomposed (`é`, removed by NFD decomposition) and
 *    already-decomposed (`e` + U+0301 in the source). Marks of every other script
 *    (Devanagari vowel signs, Thai, Arabic harakat, Hebrew niqqud) carry meaning and are kept.
 * 3. Runs of punctuation and whitespace collapse to a single space; leading and trailing runs
 *    are trimmed. Letters, numbers, combining marks, and apostrophes inside words are kept.
 *
 * The final `offsets` entry is a sentinel pointing just past the source index of the last
 * emitted character, so mapping a normalized `[start, end)` range back is always
 * `offsets[start]` to `offsets[end]` — including ranges ending at the last character, which
 * never swallow trailing punctuation or whitespace.
 *
 * @internal
 */
export function normalize(text: string): Normalized {
  const offsets: number[] = [];
  const out: string[] = [];
  /** Source index where the current punctuation/whitespace run started, or `-1` when inside one. */
  let gapStart = -1;
  /** Source index just past the last emitted character; used as the range-end sentinel. */
  let lastCharEnd = 0;

  const emit = (chars: string, sourceIndex: number): void => {
    for (const point of chars) {
      // Map each UTF-16 unit of the (possibly astral) output to the same source index.
      for (let unit = 0; unit < point.length; unit++) {
        out.push(point[unit]);
        offsets.push(sourceIndex);
      }
    }
  };

  // A collapsed run is sourced at its start so a range ending at the following token maps
  // back just past that token, never swallowing the gap.
  const flushGap = (): void => {
    if (gapStart === -1) return;

    if (out.length > 0) {
      out.push(' ');
      offsets.push(gapStart);
    }

    gapStart = -1;
  };

  let index = 0;

  while (index < text.length) {
    const point = String.fromCodePoint(text.codePointAt(index) as number);
    const lowered = point.toLowerCase();

    if (!WORD_CHAR_RE.test(lowered)) {
      if (gapStart === -1) gapStart = index;

      index += point.length;

      continue;
    }

    flushGap();

    if (MARK_START_RE.test(lowered)) {
      // A mark with no base letter in its cluster (e.g. after whitespace): kept verbatim.
      emit(lowered, index);
      index += point.length;
      lastCharEnd = index;

      continue;
    }

    const latin = LATIN_RE.test(lowered.normalize('NFD'));

    emit(latin ? foldLatinAccents(lowered) : lowered, index);
    index += point.length;

    // Consume the marks attached to this base: Latin accents fold away, every other mark
    // is kept at its own source index.
    while (index < text.length) {
      const mark = String.fromCodePoint(text.codePointAt(index) as number);

      if (!MARK_RE.test(mark)) break;

      if (!(latin && LATIN_ACCENT_RE.test(mark))) emit(mark, index);

      index += mark.length;
    }

    lastCharEnd = index;
  }

  // A run at the end of the string is dropped by the trim.
  offsets.push(lastCharEnd);

  return { offsets, text: out.join('') };
}

/**
 * NFD-decomposes `char` and drops U+0300–U+036F combining marks when its base is Latin.
 * A multi-unit lowercase result (e.g. `İ` → `i` + U+0307) is folded the same way.
 *
 * @internal
 */
export function foldLatinAccents(char: string): string {
  const decomposed = char.normalize('NFD');

  if (!LATIN_RE.test(decomposed)) return char;

  return decomposed.replace(LATIN_ACCENT_RE, '');
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

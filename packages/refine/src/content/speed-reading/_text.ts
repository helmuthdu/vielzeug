export type ReadingWord = {
  end: number;
  focal: string;
  multiplier: number;
  prefix: string;
  start: number;
  suffix: string;
  text: string;
};

export function readingWords(text: string, locale: string): ReadingWord[] {
  const words = new Intl.Segmenter(locale, { granularity: 'word' });
  const graphemes = new Intl.Segmenter(locale, { granularity: 'grapheme' });
  const sentences = new Intl.Segmenter(locale, { granularity: 'sentence' });
  const sentenceEnds = new Set(
    [...sentences.segment(text)].map(({ index, segment }) => index + segment.trimEnd().length),
  );
  const ranges: Array<{ end: number; start: number }> = [];

  for (const match of text.matchAll(/\S+/gu)) {
    const start = match.index;
    const run = match[0];
    const parts = [...words.segment(run)];
    // Keep Latin compounds, numbers and URLs intact; segment unspaced scripts.
    if (!/[^\p{Script=Latin}\p{Mark}\p{Number}\p{Punctuation}\p{Symbol}]/u.test(run)) {
      ranges.push({ end: start + run.length, start });
      continue;
    }
    let begin = 0;
    let seenWord = false;
    for (const part of parts) {
      if (part.isWordLike && seenWord) {
        ranges.push({ end: start + part.index, start: start + begin });
        begin = part.index;
      }
      if (part.isWordLike) seenWord = true;
    }
    ranges.push({ end: start + run.length, start: start + begin });
  }

  return ranges.map(({ start, end }, index) => {
    const value = text.slice(start, end);
    const units = [...graphemes.segment(value)].map(({ segment }) => segment);
    const letters = units.flatMap((unit, i) => (/[\p{Letter}\p{Number}]/u.test(unit) ? [i] : []));
    const latin = /[A-Za-z\p{Script=Latin}]/u.test(value) && !/[^\p{Script=Latin}\p{Mark}\P{Letter}]/u.test(value);
    const focalIndex = letters.length <= 1 ? 0 : Math.min(4, Math.floor((letters.length + 2) / 4));
    const anchor = latin && letters.length ? letters[focalIndex]! : -1;
    const gap = text.slice(end, ranges[index + 1]?.start ?? text.length);
    const abbreviation =
      /^(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e)\.$/iu.test(value) || /^(?:\p{Letter}\.)+$/u.test(value);
    const multiplier = /\n\s*\n/u.test(gap)
      ? 3
      : /(?:[.!?。！？]|…)[\p{Pe}\p{Pf}"']*$/u.test(value) && sentenceEnds.has(end) && !abbreviation
        ? 2
        : /[,;:，；：][\p{Pe}\p{Pf}"']*$/u.test(value)
          ? 1.5
          : 1;

    return {
      end,
      focal: anchor < 0 ? '' : units[anchor]!,
      multiplier,
      prefix: anchor < 0 ? '' : units.slice(0, anchor).join(''),
      start,
      suffix: anchor < 0 ? value : units.slice(anchor + 1).join(''),
      text: value,
    };
  });
}

import { findMatchRanges, highlight, highlightField } from '../highlight';
import type { SearchResult } from '../types';

describe('highlight', () => {
  test('empty text returns empty array', () => {
    expect(highlight('', [])).toEqual([]);
    expect(highlight('', [[0, 3]])).toEqual([]);
  });

  test('no ranges returns single unhighlighted part', () => {
    expect(highlight('Hello World', [])).toEqual([{ highlighted: false, text: 'Hello World' }]);
  });

  test('single range at start', () => {
    expect(highlight('Hello World', [[0, 5]])).toEqual([
      { highlighted: true, text: 'Hello' },
      { highlighted: false, text: ' World' },
    ]);
  });

  test('single range in the middle', () => {
    expect(highlight('Hello World', [[6, 11]])).toEqual([
      { highlighted: false, text: 'Hello ' },
      { highlighted: true, text: 'World' },
    ]);
  });

  test('single range covering entire text', () => {
    expect(highlight('Hello', [[0, 5]])).toEqual([{ highlighted: true, text: 'Hello' }]);
  });

  test('multiple non-overlapping ranges', () => {
    expect(
      highlight('Hello World', [
        [0, 5],
        [6, 11],
      ]),
    ).toEqual([
      { highlighted: true, text: 'Hello' },
      { highlighted: false, text: ' ' },
      { highlighted: true, text: 'World' },
    ]);
  });

  test('range in the middle with surrounding unhighlighted text', () => {
    expect(highlight('Say Hello there', [[4, 9]])).toEqual([
      { highlighted: false, text: 'Say ' },
      { highlighted: true, text: 'Hello' },
      { highlighted: false, text: ' there' },
    ]);
  });

  test('three ranges with gaps', () => {
    expect(
      highlight('abcdefghi', [
        [0, 2],
        [4, 6],
        [8, 9],
      ]),
    ).toEqual([
      { highlighted: true, text: 'ab' },
      { highlighted: false, text: 'cd' },
      { highlighted: true, text: 'ef' },
      { highlighted: false, text: 'gh' },
      { highlighted: true, text: 'i' },
    ]);
  });

  test('zero-length range is ignored (end === start)', () => {
    const parts = highlight('Hello', [[2, 2]]);

    expect(parts.every((p) => !p.highlighted)).toBe(true);
  });

  test('preserves original casing in output', () => {
    const parts = highlight('UPPER lower', [[0, 5]]);

    expect(parts[0].text).toBe('UPPER');
    expect(parts[1].text).toBe(' lower');
  });

  test('unicode text is handled correctly', () => {
    const parts = highlight('café', [[0, 4]]);

    expect(parts).toEqual([{ highlighted: true, text: 'café' }]);
  });
});

describe('findMatchRanges', () => {
  test('returns empty array when text is empty', () => {
    expect(findMatchRanges('', 'hello')).toEqual([]);
  });

  test('returns empty array when query is empty', () => {
    expect(findMatchRanges('hello world', '')).toEqual([]);
  });

  test('finds a single word match', () => {
    const ranges = findMatchRanges('Alice Johnson', 'alice');

    expect(ranges).toEqual([[0, 5]]);
  });

  test('matches are case-insensitive', () => {
    const ranges = findMatchRanges('HELLO', 'hello');

    expect(ranges).toEqual([[0, 5]]);
  });

  test('finds multiple non-overlapping occurrences', () => {
    const ranges = findMatchRanges('go go go', 'go');

    expect(ranges).toEqual([
      [0, 2],
      [3, 5],
      [6, 8],
    ]);
  });

  test('merges overlapping ranges', () => {
    const ranges = findMatchRanges('abcde', 'abc bcd');

    expect(ranges).toHaveLength(1);
    expect(ranges[0][0]).toBeLessThanOrEqual(0);
    expect(ranges[0][1]).toBeGreaterThanOrEqual(4);
  });

  test('a contiguous multi-word phrase match merges into one range', () => {
    expect(findMatchRanges('Alice Johnson', 'alice johnson')).toEqual([[0, 13]]);
  });

  test('non-contiguous words produce independent ranges', () => {
    expect(findMatchRanges('Johnson Alice', 'alice johnson')).toEqual([
      [0, 7],
      [8, 13],
    ]);
  });

  test('normalizes raw punctuation and whitespace in the query', () => {
    expect(findMatchRanges('Scout Index', 'scout--- index!')).toEqual([[0, 11]]);
  });

  test('maps ranges through multi-unit lowercase expansions to the original string', () => {
    // "İ".toLowerCase() is two code units long, which shifted every legacy range.
    const ranges = findMatchRanges('İİİstanbul', 'stan');

    expect(ranges).toEqual([[3, 7]]);
    expect('İİİstanbul'.slice(3, 7)).toBe('stan');
  });

  test('highlights a hyphenated phrase once instead of every contained letter', () => {
    expect(findMatchRanges('send e-mail now', 'e-mail')).toEqual([[5, 11]]);
  });

  test('folds Latin accents for matching and covers the original word', () => {
    const ranges = findMatchRanges('Café', 'cafe');

    expect(ranges).toEqual([[0, 4]]);
    expect('Café'.slice(0, 4)).toBe('Café');
  });

  test('highlights a one-character query only at word starts', () => {
    expect(findMatchRanges('J Smith', 'j')).toEqual([[0, 1]]);
    expect(findMatchRanges('mercedes', 'e')).toEqual([]);
  });

  test('keeps non-Latin combining marks and matches them exactly', () => {
    expect(findMatchRanges('किताब', 'किता')).toEqual([[0, 4]]);
    // The same word without the vowel signs is a different normalized string.
    expect(findMatchRanges('किताब', 'कतब')).toEqual([]);
  });

  test('keeps a non-Latin mark attached to a Latin base', () => {
    const text = 'a\u093Eb c';
    const ranges = findMatchRanges(text, 'a\u093e');

    expect(ranges).toEqual([[0, 2]]);
  });

  test('a match ending at the last character never swallows trailing punctuation', () => {
    expect(findMatchRanges('foo...', 'foo')).toEqual([[0, 3]]);
    expect(findMatchRanges('Smith et al.', 'al')).toEqual([[9, 11]]);
  });

  test('a dotted capital I yields a non-empty range for its folded form', () => {
    expect(findMatchRanges('İ', 'i')).toEqual([[0, 1]]);
  });
});

describe('highlightField', () => {
  type Item = { email: string; name: string };

  const makeResult = (field: keyof Item & string, ranges: [number, number][]): SearchResult<Item> => ({
    item: { email: 'alice@example.com', name: 'Alice Johnson' },
    matches: [{ field, ranges }],
    score: 0.9,
  });

  test('returns highlighted parts for a matching field', () => {
    const result = makeResult('name', [[0, 5]]);
    const parts = highlightField(result, 'name', 'Alice Johnson');

    expect(parts).toEqual([
      { highlighted: true, text: 'Alice' },
      { highlighted: false, text: ' Johnson' },
    ]);
  });

  test('returns unhighlighted part when field has no matches', () => {
    const result = makeResult('name', [[0, 5]]);
    const parts = highlightField(result, 'email', 'alice@example.com');

    expect(parts).toEqual([{ highlighted: false, text: 'alice@example.com' }]);
  });

  test('returns empty array for empty text', () => {
    const result = makeResult('name', []);
    const parts = highlightField(result, 'name', '');

    expect(parts).toEqual([]);
  });

  test('works with a result that has no matches at all (empty query)', () => {
    const result: SearchResult<Item> = {
      item: { email: 'alice@example.com', name: 'Alice Johnson' },
      matches: [],
      score: 1,
    };
    const parts = highlightField(result, 'name', 'Alice Johnson');

    expect(parts).toEqual([{ highlighted: false, text: 'Alice Johnson' }]);
  });
});

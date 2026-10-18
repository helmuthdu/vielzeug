import { describe, expect, it } from 'vitest';
import { readingWords } from './_text';

describe('paced reading text', () => {
  it('preserves source offsets, punctuation, compounds, numbers and URLs', () => {
    const text = '“Hello,”  don’t re-read 3.14 https://example.com/test.\nNext!';
    const words = readingWords(text, 'en');
    expect(words.map((word) => word.text)).toEqual([
      '“Hello,”',
      'don’t',
      're-read',
      '3.14',
      'https://example.com/test.',
      'Next!',
    ]);
    for (const word of words) {
      expect(text.slice(word.start, word.end)).toBe(word.text);
      expect(word.prefix + word.focal + word.suffix).toBe(word.text);
    }
  });

  it('chooses a length-based focal grapheme excluding punctuation', () => {
    expect(readingWords('a four hello reading extraordinary', 'en').map((word) => word.focal)).toEqual([
      'a',
      'o',
      'e',
      'a',
      'r',
    ]);
    expect(readingWords('“hello!”', 'en')[0]).toMatchObject({ focal: 'e', prefix: '“h', suffix: 'llo!”' });
  });

  it.each([
    [1, 0],
    [2, 1],
    [3, 1],
    [4, 1],
    [5, 1],
    [6, 2],
    [9, 2],
    [10, 3],
    [13, 3],
    [14, 4],
    [18, 4],
    [40, 4],
  ])('anchors a %i-letter word at zero-based position %i', (length, position) => {
    const word = 'abcdefghijklmnopqrstuvwxyz'.repeat(2).slice(0, length);
    const token = readingWords(`“${word}!”`, 'en')[0]!;
    expect(token.prefix).toBe(`“${word.slice(0, position)}`);
    expect(token.focal).toBe(word[position]);
    expect(token.prefix + token.focal + token.suffix).toBe(`“${word}!”`);
  });

  it('counts accented graphemes rather than code units when selecting the focal letter', () => {
    expect(readingWords('“e\u0301cole!”', 'fr')[0]).toMatchObject({ focal: 'c', prefix: '“e\u0301', suffix: 'ole!”' });
  });

  it('never splits a combining sequence or joined emoji', () => {
    const words = readingWords('e\u0301 👨‍👩‍👧‍👦 café', 'en');
    expect(words.map((word) => word.text)).toEqual(['e\u0301', '👨‍👩‍👧‍👦', 'café']);
    expect(words[0]?.focal).toBe('e\u0301');
    expect(words[1]?.suffix).toBe('👨‍👩‍👧‍👦');
  });

  it('uses whole centered tokens for non-Latin scripts', () => {
    const text = '你好世界 مرحبا';
    const words = readingWords(text, 'zh');
    expect(words.length).toBeGreaterThan(2);
    expect(words.map((word) => word.text).join('')).toBe(text.replace(/\s/g, ''));
    expect(words.every((word) => word.focal === '')).toBe(true);
    expect(readingWords('你好，世界！', 'zh').map((word) => word.text)).toEqual(['你好，', '世界！']);
  });

  it('uses the largest punctuation dwell instead of multiplying penalties', () => {
    expect(readingWords('One, two; three: done!\n\nNext.', 'en').map((word) => word.multiplier)).toEqual([
      1.5, 1.5, 1.5, 3, 2,
    ]);
    expect(readingWords('Dr. Smith has 3.14 apples. Next!', 'en').map((word) => word.multiplier)).toEqual([
      1, 1, 1, 1, 2, 2,
    ]);
  });

  it('accepts empty and punctuation-only text without losing content', () => {
    expect(readingWords(' \n ', 'en')).toEqual([]);
    expect(readingWords('... !!!', 'en').map((word) => word.text)).toEqual(['...', '!!!']);
  });
});

import { describe, expect, it } from 'vitest';

import { generateTrigrams, queryCoverage } from '../trigram';

describe('generateTrigrams', () => {
  it('pads with a leading and trailing space', () => {
    expect([...generateTrigrams('hello')]).toEqual([' he', 'hel', 'ell', 'llo', 'lo ']);
  });

  it('returns an empty set for an empty string', () => {
    expect(generateTrigrams('')).toEqual(new Set());
  });
});

describe('queryCoverage', () => {
  const trigrams = (text: string) => generateTrigrams(text);

  it('scores a query whose full padded trigram set appears in the field at 1', () => {
    expect(queryCoverage(trigrams('finalize'), trigrams('please finalize the budget'))).toBe(1);
  });

  it('scores a short field inside a long query by query coverage, not field containment', () => {
    const queryTrigrams = trigrams('tomato soup recipe');

    expect(queryCoverage(queryTrigrams, trigrams('tom'))).toBeCloseTo(2 / queryTrigrams.size);
  });

  it('returns 0 when either set is empty', () => {
    expect(queryCoverage(new Set(), trigrams('abc'))).toBe(0);
    expect(queryCoverage(trigrams('abc'), new Set())).toBe(0);
  });

  it('treats a single shared trigram as no match', () => {
    // "x300" and "a200" share only the trailing "00 " boundary trigram.
    expect(queryCoverage(trigrams('x300'), trigrams('a200'))).toBe(0);
  });

  it('accepts a single shared trigram when the query itself is one trigram', () => {
    // A one-character query normalizes to exactly one padded trigram; matching it is a full match.
    expect(queryCoverage(trigrams('a'), trigrams('a'))).toBe(1);
  });
});

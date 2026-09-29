import { describe, expect, it } from 'vitest';

import { dedupeEntries, escapeRegExp, type RankableEntry, rankEntries, splitPattern } from '../index';

function entry(overrides: Partial<RankableEntry> & { id: string }): RankableEntry {
  return { label: overrides.id, meta: '', text: '', ...overrides };
}

const catalog: RankableEntry[] = [
  entry({ id: 'crit', label: 'Critical health', text: 'Stealth does not protect you.' }),
  entry({ id: 'stealthy', label: 'Stealthy beast', meta: 'Monster', text: 'A creature.' }),
  entry({ id: 'stealth', label: 'Stealth', text: 'Ignore engagement.' }),
  entry({ id: 'ghost', label: 'Ghost', meta: 'Stealth expert', text: 'A hunter.' }),
  entry({ id: 'shadow', label: 'Shadow', meta: 'Keyword', text: 'Moves in stealth.' }),
  entry({ id: 'fuzzy', label: 'Unrelated', meta: 'Keyword', text: 'Typo index hit.' }),
];

const ids = (results: RankableEntry[]) => results.map((result) => result.id);

describe('rankEntries', () => {
  it('returns a copy of every entry for a blank query', () => {
    const results = rankEntries(catalog, '   ');
    expect(results).toEqual(catalog);
    expect(results).not.toBe(catalog);
  });

  it('orders exact, prefix, contains, meta, text and fuzzy matches', () => {
    expect(ids(rankEntries(catalog, 'stealth', { fuzzyIds: new Set(['fuzzy']) }))).toEqual([
      'stealth',
      'stealthy',
      'ghost',
      'crit',
      'shadow',
      'fuzzy',
    ]);
  });

  it('includes fuzzy hits only when their id is in the set', () => {
    expect(ids(rankEntries(catalog, 'stealth'))).not.toContain('fuzzy');
    expect(ids(rankEntries(catalog, 'unrelated', { fuzzyIds: new Set(['fuzzy']) }))).toEqual(['fuzzy']);
  });

  it('drops entries matching nothing and breaks ties alphabetically', () => {
    const ties = [
      entry({ id: 'sight', label: 'Sight', text: 'x' }),
      entry({ id: 'mighty', label: 'Mighty', text: 'x' }),
      entry({ id: 'other', label: 'Other', text: 'y' }),
    ];
    expect(ids(rankEntries(ties, 'ight'))).toEqual(['mighty', 'sight']);
  });
});

describe('dedupeEntries', () => {
  it('keeps the first of identical label/text pairs, case-insensitively', () => {
    const result = dedupeEntries([
      entry({ id: 'first', label: 'Ambush', text: 'Strike first.' }),
      entry({ id: 'alias', label: 'ambush', text: 'STRIKE FIRST.' }),
      entry({ id: 'variant', label: 'Ambush', text: 'Different body.' }),
    ]);
    expect(ids(result)).toEqual(['first', 'variant']);
  });
});

describe('splitPattern', () => {
  it('prefers the longest alternative at a position', () => {
    const pattern = new RegExp(`(${['Stealthy beast', 'Stealth'].map(escapeRegExp).join('|')})`, 'g');
    expect(splitPattern('A Stealthy beast lurks', pattern)).toEqual([
      { text: 'A ' },
      { matched: true, text: 'Stealthy beast' },
      { text: ' lurks' },
    ]);
  });

  it('returns the text untouched without a pattern', () => {
    expect(splitPattern('plain', null)).toEqual([{ text: 'plain' }]);
  });
});

describe('escapeRegExp', () => {
  it('escapes every regular-expression special', () => {
    expect(escapeRegExp('a.b*c?d[e]f{g}h|i')).toBe('a\\.b\\*c\\?d\\[e\\]f\\{g\\}h\\|i');
  });
});

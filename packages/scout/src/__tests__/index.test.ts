import { describe, expect, it, vi } from 'vitest';

import { ScoutConfigError, ScoutDisposedError, ScoutError } from '../errors';
import { createIndex } from '../scout-index';
import type { ScoutIndexOptions } from '../types';

type User = { age: number; email: string; name: string };

const USERS: User[] = [
  { age: 28, email: 'alice@example.com', name: 'Alice Johnson' },
  { age: 32, email: 'bob@example.com', name: 'Bob Smith' },
  { age: 25, email: 'charlie@example.com', name: 'Charlie Brown' },
  { age: 35, email: 'alicia@example.com', name: 'Alicia Keys' },
  { age: 29, email: 'dave@example.com', name: 'Dave Alison' },
];

describe('createIndex', () => {
  test('initial size reflects corpus length', () => {
    const index = createIndex(USERS, { fields: ['name'] });

    expect(index.size).toBe(5);
  });

  test('empty index has size 0', () => {
    const index = createIndex<User>([], { fields: ['name'] });

    expect(index.size).toBe(0);
  });

  test('throws ScoutConfigError when fields is empty', () => {
    expect(() => createIndex(USERS, { fields: [] })).toThrow(ScoutConfigError);
  });

  test('accepts a read-only items array', () => {
    const frozen: readonly User[] = Object.freeze([...USERS]);

    expect(createIndex(frozen, { fields: ['name'] }).size).toBe(5);
  });
});

describe('ScoutIndex.search', () => {
  test('empty query returns all items with score 1', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const results = index.search('');

    expect(results).toHaveLength(5);
    expect(results.every((r) => r.score === 1)).toBe(true);
    expect(results.every((r) => r.matches)).toBeDefined();
  });

  test('whitespace-only query returns all items', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const results = index.search('   ');

    expect(results).toHaveLength(5);
  });

  test('returns items containing the query (case-insensitive)', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const results = index.search('alice');

    const names = results.map((r) => r.item.name);

    expect(names).toContain('Alice Johnson');
    expect(names).toContain('Dave Alison');
  });

  test('matches are sorted by score descending', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const results = index.search('alice');

    for (let i = 1; i < results.length; i++) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
    }
  });

  test('threshold filters out low-scoring results', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const strict = index.search('alice', { threshold: 0.9 });

    expect(strict.length).toBeLessThan(index.search('alice').length);
  });

  test('limit caps the number of results', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const results = index.search('', { limit: 2 });

    expect(results).toHaveLength(2);
  });

  test('kept results still carry correct matches when limit cuts the candidate set', () => {
    const items = Array.from({ length: 200 }, (_, i) => ({ title: `Widget alpha ${i}` }));
    const index = createIndex(items, { fields: ['title'] });

    const results = index.search('alpha', { limit: 5 });

    expect(results).toHaveLength(5);

    for (const result of results) {
      const range = result.matches.find((m) => m.field === 'title')?.ranges[0];

      expect(range).toBeDefined();
      expect(result.item.title.slice(range![0], range![1])).toBe('alpha');
    }
  });

  test('field-restricted search only matches specified fields', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const byName = index.search('alice');
    const emailIndex = createIndex(USERS, { fields: ['email'] });
    const byEmail = emailIndex.search('alice');

    expect(byName.map((r) => r.item.name)).toContain('Alice Johnson');
    expect(byEmail.map((r) => r.item.email)).toContain('alice@example.com');
    expect(byEmail.map((r) => r.item.email)).toContain('alicia@example.com');
  });

  test('higher field weight promotes matching items', () => {
    const index = createIndex(USERS, {
      fields: [
        { field: 'name', weight: 3 },
        { field: 'email', weight: 1 },
      ],
    });

    const nameResult = index.search('alice').find((r) => r.item.name === 'Alice Johnson');

    expect(nameResult).toBeDefined();
    expect(nameResult?.score).toBeGreaterThan(0);
  });

  test('non-string field with custom stringify', () => {
    type Item = { age: number; name: string };

    const items: Item[] = [
      { age: 25, name: 'Bob' },
      { age: 30, name: 'Alice' },
    ];

    const index = createIndex(items, {
      fields: [{ field: 'age', stringify: (v) => `${v} years old` }, 'name'],
    });

    const results = index.search('25 years');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.age).toBe(25);
  });

  test('matches contain field name and ranges', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const results = index.search('alice');

    const aliceResult = results.find((r) => r.item.name === 'Alice Johnson');

    expect(aliceResult).toBeDefined();
    expect(aliceResult?.matches).toBeDefined();

    const nameMatch = aliceResult?.matches.find((m) => m.field === 'name');

    expect(nameMatch).toBeDefined();
    expect(nameMatch?.ranges.length).toBeGreaterThan(0);
    expect(nameMatch?.ranges[0]).toHaveLength(2);
  });

  test('ranges point to correct character positions', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const results = index.search('alice');
    const aliceResult = results.find((r) => r.item.name === 'Alice Johnson')!;
    const match = aliceResult.matches.find((m) => m.field === 'name')!;
    const [start, end] = match.ranges[0];

    expect(aliceResult.item.name.slice(start, end).toLowerCase()).toContain('alice');
  });

  test('short query (< 3 chars) uses containment fallback', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const results = index.search('bo');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.name).toBe('Bob Smith');
  });

  test('short query containment match returns score 1.0', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const results = index.search('bo');

    expect(results.every((r) => r.score === 1.0)).toBe(true);
  });

  // Regression: a short (>= minQueryLength, so trigram-scored) query that's a clean prefix of a
  // much longer field value used to score *below* the default 0.2 threshold under the old
  // Sørensen–Dice formula purely because of the length mismatch, disappearing from results :
  // then reappearing once the user typed enough extra characters to shrink that mismatch. E.g.
  // "fin" vs "Finalize Q3 budget report" scored ~0.14 under Dice (below threshold); "fina"
  // scored exactly 0.2 (borderline). The overlap coefficient scores purely on how much of the
  // (short) query was found, independent of the target's length, fixing this at 3 characters.
  test('a 3-character query prefix-matches a much longer field value at the default threshold', () => {
    const items = [{ title: 'Finalize Q3 budget report' }, { title: 'Unrelated task' }];
    const index = createIndex(items, { fields: ['title'] });

    const results = index.search('fin');

    expect(results.map((r) => r.item.title)).toContain('Finalize Q3 budget report');
    expect(results.find((r) => r.item.title === 'Finalize Q3 budget report')?.score).toBeGreaterThanOrEqual(0.2);
  });

  test('does not lose the match as more characters are typed: no "3 chars hides it, 4 shows it" cliff', () => {
    const items = [{ title: 'Finalize Q3 budget report' }];
    const index = createIndex(items, { fields: ['title'] });

    const threeChars = index.search('fin');
    const fourChars = index.search('fina');
    const fiveChars = index.search('final');

    expect(threeChars).toHaveLength(1);
    expect(fourChars).toHaveLength(1);
    expect(fiveChars).toHaveLength(1);
  });

  // Regression: two unrelated 4-character codes that merely end the same way (both round
  // hundreds) used to both score 0.25: a single shared boundary trigram (`"00 "`) was enough to
  // clear the default 0.2 threshold, so searching for one code surfaced every other code sharing
  // that ending too. A real fuzzy match shares *several* trigrams, not exactly one.
  test('a single shared boundary trigram does not count as a match', () => {
    const items = [{ code: 'X300' }, { code: 'A200' }, { code: 'V500' }, { code: 'R350' }];
    const index = createIndex(items, { fields: ['code'] });

    const results = index.search('x300');

    expect(results.map((r) => r.item.code)).toEqual(['X300']);
  });

  test('minQueryLength=1 uses trigram path for single-char queries', () => {
    const items = [{ name: 'b' }, { name: 'a' }];
    const index = createIndex(items, { fields: ['name'] });

    const withTrigrams = index.search('b', { minQueryLength: 1 });
    const withContainment = index.search('b');

    expect(withTrigrams).toHaveLength(1);
    expect(withTrigrams[0].item.name).toBe('b');
    expect(withContainment).toHaveLength(1);
  });

  test('minQueryLength=10 forces containment scan for typical queries', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const results = index.search('alice', { minQueryLength: 10 });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.score === 1.0)).toBe(true);
  });

  test('single-char query matches correctly', () => {
    const index = createIndex([{ name: 'A' }, { name: 'B' }], { fields: ['name'] });
    const results = index.search('a');

    expect(results).toHaveLength(1);
    expect(results[0].item.name).toBe('A');
  });

  test('no results for non-matching query', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const results = index.search('zzzzxxx', { threshold: 0.8 });

    expect(results).toHaveLength(0);
  });

  test('punctuation-only query (no indexable content) returns no results', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const results = index.search('!!!');

    expect(results).toHaveLength(0);
  });

  test('negative limits are rejected', () => {
    const index = createIndex(USERS, { fields: ['name'] });

    expect(() => index.search('', { limit: -1 })).toThrow(ScoutConfigError);
    expect(() => createIndex(USERS, { fields: ['name'], limit: -5 })).toThrow(ScoutConfigError);
  });

  test('non-ASCII scripts are searchable (CJK, Cyrillic, accented Latin)', () => {
    const items = [{ name: '日本語' }, { name: 'Явление' }, { name: 'café' }];
    const index = createIndex(items, { fields: ['name'] });

    expect(index.search('日本語').length).toBeGreaterThan(0);
    expect(index.search('явление').length).toBeGreaterThan(0);
    expect(index.search('café').length).toBeGreaterThan(0);
  });
});

describe('keyed identity', () => {
  type Row = { id: string; text: string };

  const row = (id: string, text: string): Row => ({ id, text });
  const options: ScoutIndexOptions<Row> = { fields: ['text'], key: (r) => r.id };

  test('setItems with fresh copies of unchanged items changes nothing observable', () => {
    const index = createIndex([row('1', 'Alpha')], options);
    const listener = vi.fn();

    index.subscribe(listener);
    const revision = index.revision;
    index.setItems([row('1', 'Alpha')]);

    expect(index.revision).toBe(revision);
    expect(listener).not.toHaveBeenCalled();
    expect(index.search('alpha')[0].item).toEqual(row('1', 'Alpha'));
  });

  test('setItems reindexes only the item whose text changed', () => {
    const kept = row('2', 'Bravo');
    const index = createIndex([row('1', 'Alpha'), kept], options);

    index.setItems([row('1', 'Zulu'), kept]);

    expect(index.search('zulu').map((r) => r.item.id)).toEqual(['1']);
    expect(index.search('alpha')).toEqual([]);
    expect(index.items[1]).toBe(kept);
  });

  test('two different items sharing one key throw', () => {
    const index = createIndex<Row>([], options);

    expect(() => index.setItems([row('1', 'A'), row('1', 'B')])).toThrow(ScoutConfigError);
  });

  test('construction throws when two different items share one key', () => {
    expect(() => createIndex([row('1', 'A'), row('1', 'B')], options)).toThrow(ScoutConfigError);
  });

  test('reindex and remove accept a fresh copy carrying the same key', () => {
    const index = createIndex([row('1', 'Alpha')], options);

    index.reindex(row('1', 'Zulu'));

    expect(index.items[0].text).toBe('Zulu');
    expect(index.size).toBe(1);

    index.remove(row('1', 'ignored'));

    expect(index.size).toBe(0);
  });

  test('add adopts the object already stored under the same key', () => {
    const index = createIndex([row('1', 'Alpha')], options);
    const fresh = row('1', 'Zulu');

    index.add(fresh);

    expect(index.size).toBe(1);
    expect(index.items[0]).toBe(fresh);
  });

  test('reindexing one field keeps the record findable via trigrams a sibling field still provides', () => {
    const index = createIndex([{ id: 1, name: 'apple pie', tags: 'apple' }], {
      fields: ['name', 'tags'],
      key: (item) => item.id,
    });

    index.add({ id: 1, name: 'banana split', tags: 'apple' });

    expect(index.search('apple')).toHaveLength(1);
    expect(index.search('apple')[0]?.item.name).toBe('banana split');
    expect(index.search('banana')).toHaveLength(1);
  });

  test('removeKey deletes by key and reports whether it removed anything', () => {
    const index = createIndex([row('1', 'Alpha')], options);

    expect(index.removeKey('1')).toBe(true);
    expect(index.removeKey('1')).toBe(false);
    expect(index.search('alpha')).toEqual([]);
  });
});

describe('shared normalization', () => {
  test('a punctuation-containing query matches through the punctuation', () => {
    const index = createIndex([{ name: 'a.b corp' }], { fields: ['name'], minQueryLength: 5 });

    const results = index.search('a.b');

    expect(results).toHaveLength(1);
    expect(results[0].item.name).toBe('a.b corp');
    expect(results[0].matches[0].ranges[0]).toEqual([0, 3]);
  });

  test('an unaccented query matches an accented field value at near-perfect score', () => {
    const index = createIndex([{ title: 'Café' }], { fields: ['title'] });

    const results = index.search('cafe');

    expect(results[0].score).toBeGreaterThanOrEqual(0.9);
    expect(results[0].matches[0].ranges).toEqual([[0, 4]]);
  });

  test('Devanagari vowel signs are indexed verbatim and not folded away', () => {
    const index = createIndex([{ title: 'किताब' }], { fields: ['title'] });

    const exact = index.search('किता');

    expect(exact).toHaveLength(1);
    // Three of the four padded query trigrams sit inside the word; the trailing boundary
    // trigram does not, so coverage is 3/4, not 1.
    expect(exact[0].score).toBeCloseTo(0.75);

    expect(index.search('कतब')).toHaveLength(0);
  });

  test('decomposed and precomposed Latin accents normalize identically', () => {
    const decomposed = createIndex([{ title: 'cafe\u0301' }], { fields: ['title'], threshold: 0.5 });

    const results = decomposed.search('café');

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(1);
  });

  test('a dotted capital I folds to a plain i for matching and ranges', () => {
    const index = createIndex([{ title: 'İstanbul' }], { fields: ['title'], threshold: 0.5 });

    const results = index.search('istanbul');

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(1);
    expect(results[0].matches[0].ranges[0]).toEqual([0, 8]);
  });
});

describe('query coverage scoring', () => {
  test('a long query does not fully match a short field it merely contains', () => {
    const items = [{ title: 'Tom' }, { title: 'Tomato soup recipe with basil' }];
    const index = createIndex(items, { fields: ['title'] });

    const results = index.search('tomato soup recipe');

    expect(results.map((r) => r.item.title)).toEqual(['Tomato soup recipe with basil']);
  });

  test('a short prefix still scores high against a much longer field', () => {
    const items = [{ title: 'Finalize Q3 roadmap' }];
    const index = createIndex(items, { fields: ['title'] });

    const results = index.search('fin');

    expect(results).toHaveLength(1);
    expect(results[0].score).toBeGreaterThanOrEqual(0.6);
  });

  test('a cross-field query matches split fields as well as one combined field', () => {
    // No single field ("alice" or "smith") carries enough of the query alone to pass
    // the 0.5 threshold; only the record-level trigram union reaches full coverage.
    const split = createIndex([{ first: 'Alice', last: 'Smith' }], {
      fields: ['first', 'last'],
      threshold: 0.5,
    });
    const combined = createIndex([{ full: 'Alice Smith' }], { fields: ['full'], threshold: 0.5 });

    const splitScore = split.search('alice smith')[0]?.score ?? 0;
    const combinedScore = combined.search('alice smith')[0]?.score ?? 0;

    expect(splitScore).toBeCloseTo(1);
    expect(splitScore).toBe(combinedScore);
  });

  test('a query matching two equal-weight fields outranks a query matching only one', () => {
    const items = [
      { first: 'Alice', last: 'Zephyr' },
      { first: 'Aaron', last: 'Smith' },
      { first: 'Alice', last: 'Smith' },
    ];
    const index = createIndex(items, { fields: ['first', 'last'] });

    const results = index.search('alice smith', { threshold: 0.1 });

    expect(results[0].item).toBe(items[2]);
  });
});

describe('ScoutIndex.add', () => {
  test('add() increases size', () => {
    const index = createIndex<User>([], { fields: ['name'] });

    index.add({ age: 20, email: 'new@example.com', name: 'New User' });

    expect(index.size).toBe(1);
  });

  test('added item is searchable', () => {
    const index = createIndex<User>([], { fields: ['name'] });
    const item: User = { age: 20, email: 'zephyr@example.com', name: 'Zephyr' };

    index.add(item);

    const results = index.search('zephyr');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item).toBe(item);
  });

  test('add() is idempotent: same reference added twice stays at size 1', () => {
    const item: User = { age: 20, email: 'x@x.com', name: 'Unique' };
    const index = createIndex<User>([], { fields: ['name'] });

    index.add(item);
    index.add(item);

    expect(index.size).toBe(1);
  });
});

describe('ScoutIndex.remove', () => {
  test('remove() decreases size', () => {
    const item = USERS[0];
    const index = createIndex([item], { fields: ['name'] });

    index.remove(item);

    expect(index.size).toBe(0);
  });

  test('removed item is no longer searchable', () => {
    const item = USERS[0];
    const index = createIndex([item], { fields: ['name'] });

    index.remove(item);

    const results = index.search('alice');

    expect(results.find((r) => r.item === item)).toBeUndefined();
  });

  test('remove() is a no-op for unknown item', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const stranger: User = { age: 0, email: '', name: 'Ghost' };

    expect(() => index.remove(stranger)).not.toThrow();
    expect(index.size).toBe(5);
  });
});

describe('ScoutIndex.reindex', () => {
  test('reindex() re-indexes the item under its new field values', () => {
    const item: User = { age: 20, email: 'q@x.com', name: 'QuantumFox' };
    const index = createIndex([item], { fields: ['name'] });

    item.name = 'ZebraVan';
    index.reindex(item);

    const oldResults = index.search('quantumfox', { threshold: 0.5 });
    const newResults = index.search('zebravan', { threshold: 0.5 });

    expect(oldResults.length).toBe(0);
    expect(newResults.length).toBeGreaterThan(0);
  });

  test('size stays constant after reindex', () => {
    const item = { ...USERS[0] };
    const index = createIndex([item], { fields: ['name'] });

    item.name = 'Updated';
    index.reindex(item);

    expect(index.size).toBe(1);
  });

  test('reindex() preserves insertion order of items', () => {
    const [a, b, c] = USERS;
    const index = createIndex([a, b, c], { fields: ['name'] });

    b.name = 'Bobby Updated';
    index.reindex(b);

    expect(index.items[0]).toBe(a);
    expect(index.items[1]).toBe(b);
    expect(index.items[2]).toBe(c);
  });

  test('reindex() skips unchanged fields (partial update)', () => {
    const item: User = { age: 20, email: 'q@x.com', name: 'PartialFox' };
    const index = createIndex([item], { fields: ['name', 'email'] });

    item.name = 'PartialZebra';
    index.reindex(item);

    expect(index.search('partialzebra').length).toBeGreaterThan(0);
    expect(index.search('q@x.com').length).toBeGreaterThan(0);
  });

  test('reindex() is a no-op for an item not in the index', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const stranger: User = { age: 0, email: '', name: 'Ghost' };

    expect(() => index.reindex(stranger)).not.toThrow();
    expect(index.size).toBe(5);
  });
});

describe('ScoutIndex.items', () => {
  test('items returns all indexed items', () => {
    const index = createIndex(USERS, { fields: ['name'] });

    expect(index.items).toHaveLength(5);
    expect(index.items).toEqual(USERS);
  });

  test('items is empty for an empty index', () => {
    const index = createIndex<User>([], { fields: ['name'] });

    expect(index.items).toHaveLength(0);
  });

  test('items reflects add/remove mutations', () => {
    const index = createIndex<User>([], { fields: ['name'] });
    const item: User = { age: 20, email: 'x@x.com', name: 'New' };

    index.add(item);
    expect(index.items).toContain(item);

    index.remove(item);
    expect(index.items).not.toContain(item);
  });

  test('returns a fresh array snapshot on each call', () => {
    const index = createIndex(USERS, { fields: ['name'] });

    expect(index.items).not.toBe(index.items);
    expect(index.items).toEqual(index.items);
  });
});

describe('ScoutIndex.subscribe', () => {
  test('fires when add() inserts a new item', () => {
    const index = createIndex<User>([], { fields: ['name'] });
    const listener = vi.fn();

    index.subscribe(listener);
    index.add({ age: 20, email: 'x@x.com', name: 'New' });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('does not fire when add() is a no-op (duplicate reference)', () => {
    const item: User = { age: 20, email: 'x@x.com', name: 'New' };
    const index = createIndex<User>([item], { fields: ['name'] });
    const listener = vi.fn();

    index.subscribe(listener);
    index.add(item);

    expect(listener).not.toHaveBeenCalled();
  });

  test('fires when remove() deletes an existing item', () => {
    const item = USERS[0];
    const index = createIndex([item], { fields: ['name'] });
    const listener = vi.fn();

    index.subscribe(listener);
    index.remove(item);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('does not fire when remove() is a no-op (unknown item)', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const listener = vi.fn();

    index.subscribe(listener);
    index.remove({ age: 0, email: '', name: 'Ghost' });

    expect(listener).not.toHaveBeenCalled();
  });

  test('fires when reindex() actually changes a field value', () => {
    const item: User = { age: 20, email: 'q@x.com', name: 'QuantumFox' };
    const index = createIndex([item], { fields: ['name'] });
    const listener = vi.fn();

    index.subscribe(listener);
    item.name = 'ZebraVan';
    index.reindex(item);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('does not fire when reindex() has no field changes', () => {
    const item = USERS[0];
    const index = createIndex([item], { fields: ['name'] });
    const listener = vi.fn();

    index.subscribe(listener);
    index.reindex(item);

    expect(listener).not.toHaveBeenCalled();
  });

  test('does not fire when reindex() targets an item not in the index', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const listener = vi.fn();

    index.subscribe(listener);
    index.reindex({ age: 0, email: '', name: 'Ghost' });

    expect(listener).not.toHaveBeenCalled();
  });

  test('notifies every subscribed listener', () => {
    const index = createIndex<User>([], { fields: ['name'] });
    const listenerA = vi.fn();
    const listenerB = vi.fn();

    index.subscribe(listenerA);
    index.subscribe(listenerB);
    index.add({ age: 20, email: 'x@x.com', name: 'New' });

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(1);
  });

  test('the returned unsubscribe function stops future notifications', () => {
    const index = createIndex<User>([], { fields: ['name'] });
    const listener = vi.fn();

    const unsubscribe = index.subscribe(listener);

    index.add({ age: 20, email: 'a@x.com', name: 'A' });
    unsubscribe();
    index.add({ age: 21, email: 'b@x.com', name: 'B' });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('ScoutIndex.setItems', () => {
  test('reconciles additions, removals, retained mutations, and incoming order in one operation', () => {
    const removed = { name: 'Removed' };
    const retained = { name: 'Before' };
    const added = { name: 'Added' };
    const index = createIndex([removed, retained], { fields: ['name'] });
    const listener = vi.fn();

    index.subscribe(listener);
    retained.name = 'After';
    index.setItems([added, retained]);

    expect(index.items).toEqual([added, retained]);
    expect(index.search('before')).toEqual([]);
    expect(index.search('after').map((result) => result.item)).toEqual([retained]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('collapses duplicate references and does not notify for an unchanged corpus', () => {
    const item = { name: 'One' };
    const index = createIndex([item], { fields: ['name'] });
    const listener = vi.fn();

    index.subscribe(listener);
    index.setItems([item, item]);

    expect(index.items).toEqual([item]);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('configuration validation', () => {
  test.each([
    [{ fields: [{ field: 'name', weight: 0 }] }, 'weight'],
    [{ fields: [{ field: 'name', weight: Number.NaN }] }, 'weight'],
    [{ fields: ['name'], threshold: -0.1 }, 'threshold'],
    [{ fields: ['name'], threshold: Number.POSITIVE_INFINITY }, 'threshold'],
    [{ fields: ['name'], limit: -1 }, 'limit'],
    [{ fields: ['name'], limit: 1.5 }, 'limit'],
    [{ fields: ['name'], minQueryLength: 0 }, 'minQueryLength'],
    [{ fields: ['name'], minQueryLength: Number.POSITIVE_INFINITY }, 'minQueryLength'],
  ] as Array<[Record<string, unknown>, string]>)('rejects invalid index %s configuration', (options) => {
    expect(() => createIndex([{ name: 'Alice' }], options as never)).toThrow(ScoutConfigError);
  });

  test.each([
    [{ threshold: Number.NaN }, 'threshold'],
    [{ limit: -1 }, 'limit'],
    [{ minQueryLength: 0 }, 'minQueryLength'],
  ] as Array<[Record<string, unknown>, string]>)('rejects invalid per-search %s override', (options) => {
    const index = createIndex([{ name: 'Alice' }], { fields: ['name'] });

    expect(() => index.search('alice', options as never)).toThrow(ScoutConfigError);
  });
});

describe('tokenization: punctuation handling', () => {
  test('hyphenated field values are searchable by each part', () => {
    const items = [{ sku: 'WGT-001' }, { sku: 'GAD-002' }];
    const index = createIndex(items, { fields: ['sku'] });

    const results = index.search('wgt');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.sku).toBe('WGT-001');
  });

  test('dotted values are searchable by each segment', () => {
    const items = [{ path: 'foo.bar.baz' }, { path: 'qux.quux' }];
    const index = createIndex(items, { fields: ['path'] });

    const results = index.search('bar');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.path).toBe('foo.bar.baz');
  });

  test('underscores are treated as separators, not word characters', () => {
    const items = [{ slug: 'foo_bar_baz' }, { slug: 'qux_quux' }];
    const index = createIndex(items, { fields: ['slug'] });

    const results = index.search('bar');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.slug).toBe('foo_bar_baz');
  });
});

describe('ScoutError: named subclasses', () => {
  it('each subclass is instanceof ScoutError and Error', () => {
    expect(new ScoutDisposedError('disposed')).toBeInstanceOf(ScoutError);
    expect(new ScoutDisposedError('disposed')).toBeInstanceOf(Error);
    expect(new ScoutConfigError('index')).toBeInstanceOf(ScoutError);
  });

  it('each subclass has the correct .name', () => {
    expect(new ScoutDisposedError('').name).toBe('ScoutDisposedError');
    expect(new ScoutConfigError('').name).toBe('ScoutConfigError');
  });

  it('preserves the cause via ErrorOptions', () => {
    const cause = new Error('underlying failure');
    const err = new ScoutConfigError('wrapped', { cause });

    expect(err.cause).toBe(cause);
  });
});

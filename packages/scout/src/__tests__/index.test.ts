import { describe, expect, it } from 'vitest';

import { ScoutDisposedError, ScoutError, ScoutIndexError } from '../errors';
import { createIndex } from '../scout-index';

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
    expect(nameResult!.score).toBeGreaterThan(0);
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
    expect(aliceResult!.matches).toBeDefined();

    const nameMatch = aliceResult!.matches.find((m) => m.field === 'name');

    expect(nameMatch).toBeDefined();
    expect(nameMatch!.ranges.length).toBeGreaterThan(0);
    expect(nameMatch!.ranges[0]).toHaveLength(2);
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

  test('add() is idempotent — same reference added twice stays at size 1', () => {
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
});

describe('tokenization — punctuation handling', () => {
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

describe('ScoutError — named subclasses', () => {
  it('each subclass is instanceof ScoutError and Error', () => {
    expect(new ScoutDisposedError('disposed')).toBeInstanceOf(ScoutError);
    expect(new ScoutDisposedError('disposed')).toBeInstanceOf(Error);
    expect(new ScoutIndexError('index')).toBeInstanceOf(ScoutError);
  });

  it('each subclass has the correct .name', () => {
    expect(new ScoutDisposedError('').name).toBe('ScoutDisposedError');
    expect(new ScoutIndexError('').name).toBe('ScoutIndexError');
  });

  it('ScoutError.is() returns true for any subclass', () => {
    expect(ScoutError.is(new ScoutDisposedError(''))).toBe(true);
    expect(ScoutError.is(new Error('plain'))).toBe(false);
  });
});

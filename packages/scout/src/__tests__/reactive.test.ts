import { vi } from 'vitest';

import { ScoutDisposedError } from '../errors';
import { createReactiveSearch, createSearch } from '../reactive';
import { createIndex } from '../scout-index';

type User = { name: string };

const USERS: User[] = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }];

function makeSearch(debounce = 200) {
  const index = createIndex(USERS, { fields: ['name'] });

  return createSearch(index, { debounce });
}

describe('createSearch — initial state', () => {
  test('query starts as empty string', () => {
    const search = makeSearch();

    expect(search.query.value).toBe('');
    search.dispose();
  });

  test('results start as all items (empty query)', () => {
    const search = makeSearch(0);

    expect(search.results.value).toHaveLength(3);
    search.dispose();
  });

  test('isSearching starts false', () => {
    const search = makeSearch();

    expect(search.isSearching.value).toBe(false);
    search.dispose();
  });
});

describe('createSearch — debounce=0 (synchronous)', () => {
  test('results update synchronously when debounce is 0', () => {
    const search = makeSearch(0);

    search.query.value = 'alice';

    expect(search.results.value.length).toBeGreaterThan(0);
    expect(search.results.value[0].item.name).toBe('Alice');
    search.dispose();
  });

  test('isSearching stays false when debounce is 0', () => {
    const search = makeSearch(0);

    search.query.value = 'alice';

    expect(search.isSearching.value).toBe(false);
    search.dispose();
  });

  test('empty query returns all items', () => {
    const search = makeSearch(0);

    search.query.value = 'alice';
    search.query.value = '';

    expect(search.results.value).toHaveLength(3);
    search.dispose();
  });
});

describe('createSearch — debounce (timer-based)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('isSearching becomes true immediately after query change', () => {
    const search = makeSearch(100);

    search.query.value = 'alice';

    expect(search.isSearching.value).toBe(true);
    search.dispose();
  });

  test('results do not update before debounce fires', () => {
    const search = makeSearch(100);
    const initialCount = search.results.value.length;

    search.query.value = 'alice';
    vi.advanceTimersByTime(50);

    expect(search.results.value.length).toBe(initialCount);
    search.dispose();
  });

  test('results update and isSearching clears after debounce fires', () => {
    const search = makeSearch(100);

    search.query.value = 'alice';
    vi.advanceTimersByTime(100);

    expect(search.isSearching.value).toBe(false);
    expect(search.results.value.length).toBeGreaterThan(0);
    expect(search.results.value[0].item.name).toBe('Alice');
    search.dispose();
  });

  test('rapid query changes debounce correctly — only last fires', () => {
    const search = makeSearch(100);

    search.query.value = 'al';
    vi.advanceTimersByTime(50);
    search.query.value = 'ali';
    vi.advanceTimersByTime(50);
    search.query.value = 'alice';
    vi.advanceTimersByTime(100);

    expect(search.results.value[0].item.name).toBe('Alice');
    search.dispose();
  });
});

describe('createSearch — clear()', () => {
  test('clear() resets query to empty string', () => {
    const search = makeSearch(0);

    search.query.value = 'alice';
    search.clear();

    expect(search.query.value).toBe('');
    search.dispose();
  });

  test('clear() resets results to all items', () => {
    const search = makeSearch(0);

    search.query.value = 'alice';
    search.clear();

    expect(search.results.value).toHaveLength(3);
    search.dispose();
  });

  test('clear() cancels pending debounce and sets isSearching=false', () => {
    vi.useFakeTimers();

    const search = makeSearch(200);

    search.query.value = 'alice';

    expect(search.isSearching.value).toBe(true);

    search.clear();

    expect(search.isSearching.value).toBe(false);

    vi.useRealTimers();
    search.dispose();
  });

  test('clear() after dispose() throws ScoutDisposedError', () => {
    const search = makeSearch(0);

    search.dispose();

    expect(() => search.clear()).toThrow(ScoutDisposedError);
  });
});

describe('createSearch — dispose', () => {
  test('dispose() marks signals as disposed', () => {
    const search = makeSearch(0);

    search.dispose();

    expect(search.query.disposed).toBe(true);
    expect(search.isSearching.disposed).toBe(true);
    expect(search.results.disposed).toBe(true);
  });

  test('[Symbol.dispose]() delegates to dispose()', () => {
    const search = makeSearch(0);

    search[Symbol.dispose]();

    expect(search.query.disposed).toBe(true);
  });

  test('dispose() is safe to call multiple times', () => {
    const search = makeSearch(0);

    expect(() => {
      search.dispose();
      search.dispose();
    }).not.toThrow();
  });

  test('disposalSignal is not aborted before dispose()', () => {
    const search = makeSearch(0);

    expect(search.disposalSignal.aborted).toBe(false);
    search.dispose();
  });

  test('disposalSignal is aborted after dispose()', () => {
    const search = makeSearch(0);

    search.dispose();

    expect(search.disposalSignal.aborted).toBe(true);
  });
});

describe('createSearch — reactivity to index mutations', () => {
  test('results recompute after index.add() with no query change', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const search = createSearch(index, { debounce: 0 });

    expect(search.results.value).toHaveLength(3);

    index.add({ name: 'Diana' });

    expect(search.results.value).toHaveLength(4);
    search.dispose();
  });

  test('results recompute after index.remove() with no query change', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const search = createSearch(index, { debounce: 0 });

    index.remove(USERS[0]);

    expect(search.results.value).toHaveLength(2);
    search.dispose();
  });

  test('results recompute after index.reindex() with no query change', () => {
    const item = { name: 'Alice' };
    const index = createIndex([item], { fields: ['name'] });
    const search = createSearch(index, { debounce: 0, threshold: 0.5 });

    search.query.value = 'alice';
    expect(search.results.value).toHaveLength(1);

    item.name = 'Zebra';
    index.reindex(item);

    expect(search.results.value).toHaveLength(0);
    search.dispose();
  });

  test('two createSearch() instances over the same index both react to mutations', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const searchA = createSearch(index, { debounce: 0 });
    const searchB = createSearch(index, { debounce: 0 });

    index.add({ name: 'Diana' });

    expect(searchA.results.value).toHaveLength(4);
    expect(searchB.results.value).toHaveLength(4);

    searchA.dispose();
    index.add({ name: 'Eve' });

    expect(searchB.results.value).toHaveLength(5);
    searchB.dispose();
  });
});

describe('createSearch — options', () => {
  test('limit option caps results', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const search = createSearch(index, { debounce: 0, limit: 1 });

    expect(search.results.value).toHaveLength(1);
    search.dispose();
  });

  test('threshold option filters low-scoring results', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const search = createSearch(index, { debounce: 0, threshold: 0.99 });

    search.query.value = 'alic';

    expect(search.results.value).toHaveLength(0);
    search.dispose();
  });
});

describe('createReactiveSearch', () => {
  test('creates index + search state in one call', () => {
    const search = createReactiveSearch(USERS, { debounce: 0, fields: ['name'] });

    expect(search.query.value).toBe('');
    expect(search.results.value).toHaveLength(3);
    search.dispose();
  });

  test('exposes the underlying index via .index', () => {
    const search = createReactiveSearch(USERS, { debounce: 0, fields: ['name'] });

    expect(search.index).toBeDefined();
    expect(search.index.size).toBe(3);
    search.dispose();
  });

  test('search state is reactive against the exposed index', () => {
    const search = createReactiveSearch(USERS, { debounce: 0, fields: ['name'] });
    const newUser: User = { name: 'Diana' };

    search.index.add(newUser);
    expect(search.index.size).toBe(4);

    search.query.value = 'diana';
    expect(search.results.value.length).toBeGreaterThan(0);
    expect(search.results.value[0].item).toBe(newUser);
    search.dispose();
  });

  test('dispose() works as expected', () => {
    const search = createReactiveSearch(USERS, { debounce: 0, fields: ['name'] });

    search.dispose();

    expect(search.query.disposed).toBe(true);
  });

  test('respects limit option', () => {
    const search = createReactiveSearch(USERS, { debounce: 0, fields: ['name'], limit: 1 });

    expect(search.results.value).toHaveLength(1);
    search.dispose();
  });

  test('respects threshold option', () => {
    const search = createReactiveSearch(USERS, { debounce: 0, fields: ['name'], threshold: 0.99 });

    search.query.value = 'alic';

    expect(search.results.value).toHaveLength(0);
    search.dispose();
  });

  test('respects minQueryLength option', () => {
    const search = createReactiveSearch(USERS, { debounce: 0, fields: ['name'], minQueryLength: 10 });

    search.query.value = 'alice';

    // Below minQueryLength(10) forces the containment path — always score 1.0
    expect(search.results.value.every((r) => r.score === 1)).toBe(true);
    search.dispose();
  });

  test('respects debounce option (non-zero, timer-based)', () => {
    vi.useFakeTimers();

    const search = createReactiveSearch(USERS, { debounce: 100, fields: ['name'] });

    search.query.value = 'alice';
    expect(search.isSearching.value).toBe(true);

    vi.advanceTimersByTime(100);
    expect(search.isSearching.value).toBe(false);
    expect(search.results.value[0].item.name).toBe('Alice');

    vi.useRealTimers();
    search.dispose();
  });
});

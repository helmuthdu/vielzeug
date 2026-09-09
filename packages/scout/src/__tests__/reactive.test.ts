import { vi } from 'vitest';

import { ScoutConfigurationError, ScoutDisposedError } from '../errors';
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

    expect(search.getSnapshot().query).toBe('');
    search.dispose();
  });

  test('results start as all items (empty query)', () => {
    const search = makeSearch(0);

    expect(search.getSnapshot().results).toHaveLength(3);
    search.dispose();
  });

  test('isSearching starts false', () => {
    const search = makeSearch();

    expect(search.getSnapshot().isSearching).toBe(false);
    search.dispose();
  });
});

describe('createSearch — debounce=0 (synchronous)', () => {
  test('results update synchronously when debounce is 0', () => {
    const search = makeSearch(0);

    search.setQuery('alice');

    expect(search.getSnapshot().results.length).toBeGreaterThan(0);
    expect(search.getSnapshot().results[0].item.name).toBe('Alice');
    search.dispose();
  });

  test('isSearching stays false when debounce is 0', () => {
    const search = makeSearch(0);

    search.setQuery('alice');

    expect(search.getSnapshot().isSearching).toBe(false);
    search.dispose();
  });

  test('empty query returns all items', () => {
    const search = makeSearch(0);

    search.setQuery('alice');
    search.setQuery('');

    expect(search.getSnapshot().results).toHaveLength(3);
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

    search.setQuery('alice');

    expect(search.getSnapshot().isSearching).toBe(true);
    search.dispose();
  });

  test('results do not update before debounce fires', () => {
    const search = makeSearch(100);
    const initialCount = search.getSnapshot().results.length;

    search.setQuery('alice');
    vi.advanceTimersByTime(50);

    expect(search.getSnapshot().results.length).toBe(initialCount);
    search.dispose();
  });

  test('results update and isSearching clears after debounce fires', () => {
    const search = makeSearch(100);

    search.setQuery('alice');
    vi.advanceTimersByTime(100);

    expect(search.getSnapshot().isSearching).toBe(false);
    expect(search.getSnapshot().results.length).toBeGreaterThan(0);
    expect(search.getSnapshot().results[0].item.name).toBe('Alice');
    search.dispose();
  });

  test('rapid query changes debounce correctly — only last fires', () => {
    const search = makeSearch(100);

    search.setQuery('al');
    vi.advanceTimersByTime(50);
    search.setQuery('ali');
    vi.advanceTimersByTime(50);
    search.setQuery('alice');
    vi.advanceTimersByTime(100);

    expect(search.getSnapshot().results[0].item.name).toBe('Alice');
    search.dispose();
  });
});

describe('createSearch — clear()', () => {
  test('clear() resets query to empty string', () => {
    const search = makeSearch(0);

    search.setQuery('alice');
    search.clear();

    expect(search.getSnapshot().query).toBe('');
    search.dispose();
  });

  test('clear() resets results to all items', () => {
    const search = makeSearch(0);

    search.setQuery('alice');
    search.clear();

    expect(search.getSnapshot().results).toHaveLength(3);
    search.dispose();
  });

  test('clear() cancels pending debounce and sets isSearching=false', () => {
    vi.useFakeTimers();

    const search = makeSearch(200);

    search.setQuery('alice');

    expect(search.getSnapshot().isSearching).toBe(true);

    search.clear();

    expect(search.getSnapshot().isSearching).toBe(false);

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
  test('dispose() stops internal subscriptions', () => {
    const search = makeSearch(0);

    search.dispose();

    expect(search.disposed).toBe(true);
  });

  test('[Symbol.dispose]() delegates to dispose()', () => {
    const search = makeSearch(0);

    search[Symbol.dispose]();

    expect(search.disposed).toBe(true);
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

  test('setQuery() after dispose() throws ScoutDisposedError', () => {
    const search = makeSearch(0);
    search.dispose();

    expect(() => search.setQuery('alice')).toThrow(ScoutDisposedError);
  });
});

describe('createSearch — reactivity to index mutations', () => {
  test('results recompute after index.add() with no query change', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const search = createSearch(index, { debounce: 0 });

    expect(search.getSnapshot().results).toHaveLength(3);

    index.add({ name: 'Diana' });

    expect(search.getSnapshot().results).toHaveLength(4);
    search.dispose();
  });

  test('results recompute after index.remove() with no query change', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const search = createSearch(index, { debounce: 0 });

    index.remove(USERS[0]);

    expect(search.getSnapshot().results).toHaveLength(2);
    search.dispose();
  });

  test('results recompute after index.reindex() with no query change', () => {
    const item = { name: 'Alice' };
    const index = createIndex([item], { fields: ['name'] });
    const search = createSearch(index, { debounce: 0, threshold: 0.5 });

    search.setQuery('alice');
    expect(search.getSnapshot().results).toHaveLength(1);

    item.name = 'Zebra';
    index.reindex(item);

    expect(search.getSnapshot().results).toHaveLength(0);
    search.dispose();
  });

  test('results recompute after index.setItems() with no query change', () => {
    const retained = { name: 'Alice' };
    const index = createIndex([retained], { fields: ['name'] });
    const search = createSearch(index, { debounce: 0 });

    index.setItems([{ name: 'Bob' }, retained]);

    expect(search.getSnapshot().results.map((result) => result.item.name)).toEqual(['Bob', 'Alice']);
    search.dispose();
  });

  test('two createSearch() instances over the same index both react to mutations', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const searchA = createSearch(index, { debounce: 0 });
    const searchB = createSearch(index, { debounce: 0 });

    index.add({ name: 'Diana' });

    expect(searchA.getSnapshot().results).toHaveLength(4);
    expect(searchB.getSnapshot().results).toHaveLength(4);

    searchA.dispose();
    index.add({ name: 'Eve' });

    expect(searchB.getSnapshot().results).toHaveLength(5);
    searchB.dispose();
  });
});

describe('createSearch — subscriptions', () => {
  test('publishes one consistent snapshot per state transition', () => {
    vi.useFakeTimers();
    const search = makeSearch(100);
    const snapshots: Array<{ isSearching: boolean; names: string[]; query: string }> = [];
    search.subscribe(() => {
      const snapshot = search.getSnapshot();
      snapshots.push({
        isSearching: snapshot.isSearching,
        names: snapshot.results.map((result) => result.item.name),
        query: snapshot.query,
      });
    });

    search.setQuery('alice');
    vi.advanceTimersByTime(100);

    expect(snapshots).toEqual([
      { isSearching: true, names: ['Alice', 'Bob', 'Charlie'], query: 'alice' },
      { isSearching: false, names: ['Alice'], query: 'alice' },
    ]);
    vi.useRealTimers();
    search.dispose();
  });

  test('keeps snapshot identity stable and exposes runtime-read-only state', () => {
    const search = makeSearch(0);
    const snapshot = search.getSnapshot();

    expect(snapshot).toBe(search.getSnapshot());
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.results)).toBe(true);
    search.dispose();
  });

  test('reports listener failures asynchronously after notifying later listeners', () => {
    const search = makeSearch(0);
    const report = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(() => undefined);
    const listener = vi.fn();
    search.subscribe(() => {
      throw new Error('consumer failure');
    });
    search.subscribe(listener);

    expect(() => search.setQuery('alice')).not.toThrow();
    expect(listener).toHaveBeenCalledOnce();
    expect(report).toHaveBeenCalledOnce();
    report.mockRestore();
    search.dispose();
  });

  test('defers listeners added during notification until the next transition', () => {
    const search = makeSearch(0);
    const lateListener = vi.fn();
    search.subscribe(() => search.subscribe(lateListener));

    search.setQuery('alice');
    expect(lateListener).not.toHaveBeenCalled();
    search.clear();
    expect(lateListener).toHaveBeenCalledOnce();
    search.dispose();
  });

  test('supports abortable subscriptions', () => {
    const search = makeSearch(0);
    const controller = new AbortController();
    const listener = vi.fn();
    search.subscribe(listener, { signal: controller.signal });

    controller.abort();
    search.setQuery('alice');

    expect(listener).not.toHaveBeenCalled();
    search.dispose();
  });

  test('emits typed state and dispose events without exposing control flow to tapper errors', () => {
    const search = makeSearch(0);
    const events: string[] = [];
    search.tap((event) => events.push(event.type));
    search.tap(() => {
      throw new Error('observer failure');
    });

    expect(() => search.setQuery('alice')).not.toThrow();
    expect(() => search.dispose()).not.toThrow();
    expect(events).toEqual(['state-change', 'dispose']);
  });
});

describe('createSearch — options', () => {
  test('limit option caps results', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const search = createSearch(index, { debounce: 0, limit: 1 });

    expect(search.getSnapshot().results).toHaveLength(1);
    search.dispose();
  });

  test('threshold option filters low-scoring results', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const search = createSearch(index, { debounce: 0, threshold: 0.99 });

    search.setQuery('alic');

    expect(search.getSnapshot().results).toHaveLength(0);
    search.dispose();
  });
});

describe('createSearch — configuration validation', () => {
  test.each([[-1], [1.5], [Number.NaN], [Number.POSITIVE_INFINITY]])('rejects invalid debounce %s', (debounce) => {
    const index = createIndex(USERS, { fields: ['name'] });

    expect(() => createSearch(index, { debounce })).toThrow(ScoutConfigurationError);
  });
});

describe('createReactiveSearch', () => {
  test('creates index + search state in one call', () => {
    const search = createReactiveSearch(USERS, { debounce: 0, fields: ['name'] });

    expect(search.getSnapshot().query).toBe('');
    expect(search.getSnapshot().results).toHaveLength(3);
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

    search.setQuery('diana');
    expect(search.getSnapshot().results.length).toBeGreaterThan(0);
    expect(search.getSnapshot().results[0].item).toBe(newUser);
    search.dispose();
  });

  test('dispose() works as expected', () => {
    const search = createReactiveSearch(USERS, { debounce: 0, fields: ['name'] });

    search.dispose();

    expect(search.disposed).toBe(true);
  });

  test('respects limit option', () => {
    const search = createReactiveSearch(USERS, { debounce: 0, fields: ['name'], limit: 1 });

    expect(search.getSnapshot().results).toHaveLength(1);
    search.dispose();
  });

  test('respects threshold option', () => {
    const search = createReactiveSearch(USERS, { debounce: 0, fields: ['name'], threshold: 0.99 });

    search.setQuery('alic');

    expect(search.getSnapshot().results).toHaveLength(0);
    search.dispose();
  });

  test('respects minQueryLength option', () => {
    const search = createReactiveSearch(USERS, { debounce: 0, fields: ['name'], minQueryLength: 10 });

    search.setQuery('alice');

    // Below minQueryLength(10) forces the containment path — always score 1.0
    expect(search.getSnapshot().results.every((r) => r.score === 1)).toBe(true);
    search.dispose();
  });

  test('respects debounce option (non-zero, timer-based)', () => {
    vi.useFakeTimers();

    const search = createReactiveSearch(USERS, { debounce: 100, fields: ['name'] });

    search.setQuery('alice');
    expect(search.getSnapshot().isSearching).toBe(true);

    vi.advanceTimersByTime(100);
    expect(search.getSnapshot().isSearching).toBe(false);
    expect(search.getSnapshot().results[0].item.name).toBe('Alice');

    vi.useRealTimers();
    search.dispose();
  });
});

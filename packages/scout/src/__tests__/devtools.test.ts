import { vi } from 'vitest';

import { debugSearch } from '../devtools';
import { createSearch } from '../reactive';
import { createIndex } from '../scout-index';

type User = { name: string };

const USERS: User[] = [{ name: 'Alice' }, { name: 'Bob' }];

describe('debugSearch', () => {
  test('logs a query transition via console.debug', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const index = createIndex(USERS, { fields: ['name'] });
    const search = createSearch(index, { debounce: 0 });
    const stop = debugSearch(search);

    search.query.value = 'alice';

    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('query -> "alice"'));
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('results ->'));

    stop();
    search.dispose();
    debugSpy.mockRestore();
  });

  test('returned stop() unsubscribes all listeners', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const index = createIndex(USERS, { fields: ['name'] });
    const search = createSearch(index, { debounce: 0 });
    const stop = debugSearch(search);

    stop();
    debugSpy.mockClear();

    search.query.value = 'bob';

    expect(debugSpy).not.toHaveBeenCalled();

    search.dispose();
    debugSpy.mockRestore();
  });

  test('logs the isSearching true -> false transition under real debounce', () => {
    vi.useFakeTimers();

    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const index = createIndex(USERS, { fields: ['name'] });
    const search = createSearch(index, { debounce: 100 });
    const stop = debugSearch(search);

    search.query.value = 'alice';
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('isSearching -> true'));

    vi.advanceTimersByTime(100);
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('isSearching -> false'));

    stop();
    vi.useRealTimers();
    search.dispose();
    debugSpy.mockRestore();
  });

  test('does not throw when called on an already-disposed SearchState', () => {
    const index = createIndex(USERS, { fields: ['name'] });
    const search = createSearch(index, { debounce: 0 });

    search.dispose();

    expect(() => debugSearch(search)()).not.toThrow();
  });
});

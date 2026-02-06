import { list } from '../list';

describe('list', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default configuration', () => {
    const data = [1, 2, 3, 4, 5, 6];
    const instance = list(data);

    expect(instance.current).toEqual([1, 2, 3, 4, 5, 6]);
    expect(instance.meta).toEqual({
      end: 6,
      isEmpty: false,
      isFirst: true,
      isLast: true,
      limit: 10,
      page: 1,
      pages: 1,
      start: 1,
      total: 6,
    });
  });

  it('should allow setting a custom page size', () => {
    const data = [1, 2, 3, 4, 5, 6];
    const instance = list(data, { limit: 3 });

    expect(instance.current).toEqual([1, 2, 3]);
    expect(instance.meta).toEqual({
      end: 3,
      isEmpty: false,
      isFirst: true,
      isLast: false,
      limit: 3,
      page: 1,
      pages: 2,
      start: 1,
      total: 6,
    });
  });

  it('should navigate to the next page', () => {
    const data = [1, 2, 3, 4, 5, 6];
    const instance = list(data, { limit: 5 });

    instance.next();
    expect(instance.current).toEqual([6]);
    expect(instance.meta).toEqual({
      end: 6,
      isEmpty: false,
      isFirst: false,
      isLast: true,
      limit: 5,
      page: 2,
      pages: 2,
      start: 6,
      total: 6,
    });
  });

  it('should navigate to the previous page', () => {
    const data = [1, 2, 3, 4, 5, 6];
    const instance = list(data, { limit: 5 });

    instance.next();
    instance.prev();
    expect(instance.current).toEqual([1, 2, 3, 4, 5]);
  });

  it('should navigate using goTo method', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const instance = list(data, { limit: 3 });

    instance.goTo(2);
    expect(instance.current).toEqual([4, 5, 6]);
    expect(instance.meta.page).toBe(2);

    instance.goTo(3);
    expect(instance.current).toEqual([7, 8, 9]);
  });

  it('should filter data based on a predicate', () => {
    const data = [1, 2, 3, 4, 5, 6];
    const instance = list(data);

    instance.setFilter((item) => item % 2 === 0);
    expect(instance.current).toEqual([2, 4, 6]);
    expect(instance.meta.page).toBe(1); // resets to page 1
  });

  it('should sort data using a custom sort function', () => {
    const data = [3, 1, 4, 2];
    const instance = list(data);

    instance.setSort((a, b) => a - b);
    expect(instance.current).toEqual([1, 2, 3, 4]);

    instance.setSort((a, b) => b - a);
    expect(instance.current).toEqual([4, 3, 2, 1]);

    instance.setSort(); // remove sort
    expect(instance.current).toEqual([3, 1, 4, 2]);
  });

  it('should search data with debounce', async () => {
    const data = ['apple', 'banana', 'cherry'];
    const searchFn = (items: readonly string[], query: string) => items.filter((item) => item.includes(query));
    const instance = list(data, { searchFn });

    instance.search('ban'); // default: debounced
    expect(instance.current).toEqual(['apple', 'banana', 'cherry']); // not updated yet

    vi.advanceTimersByTime(300);
    vi.runAllTimers();
    expect(instance.current).toEqual(['banana']);
  });

  it('should search data immediately when immediate=true', async () => {
    const data = ['apple', 'banana', 'cherry'];
    const searchFn = (items: readonly string[], query: string) => items.filter((item) => item.includes(query));
    const instance = list(data, { searchFn });

    instance.search('ban', { immediate: true });
    expect(instance.current).toEqual(['banana']); // immediate update
  });

  it('should reset to the initial state', async () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const instance = list(data, { filterFn: (x) => x > 2, limit: 2 });

    instance.setFilter((item) => item % 2 === 0);
    instance.next();

    expect(instance.meta.page).toBe(2);
    expect(instance.current).toEqual([6, 8]);

    instance.reset();
    expect(instance.current).toEqual([3, 4]);
    expect(instance.meta.page).toBe(1);
  });

  it('should handle empty data', () => {
    const data: number[] = [];
    const instance = list(data);

    expect(instance.current).toEqual([]);
    expect(instance.meta.isEmpty).toBe(true);
    expect(instance.meta.start).toBe(0);
    expect(instance.meta.end).toBe(0);
  });

  it('should update data dynamically', async () => {
    const data = [1, 2, 3];
    const instance = list(data);

    instance.setData?.([4, 5, 6]);
    expect(instance.current).toEqual([4, 5, 6]);
    expect(instance.meta.page).toBe(1); // resets to page 1
  });

  it('should handle goTo with out-of-bounds page numbers', async () => {
    const data = [1, 2, 3, 4, 5, 6];
    const instance = list(data, { limit: 2 });

    instance.goTo(10); // beyond last page
    expect(instance.current).toEqual([5, 6]);

    instance.goTo(-10); // before first page
    expect(instance.current).toEqual([1, 2]);
  });

  it('should handle changing page size dynamically', async () => {
    const data = [1, 2, 3, 4, 5, 6];
    const instance = list(data);

    instance.setLimit(2);
    expect(instance.current).toEqual([1, 2]);
    expect(instance.meta.pages).toBe(3);
  });

  it('should check if it is the first or last page', async () => {
    const data = [1, 2, 3, 4, 5, 6];
    const instance = list(data, { limit: 5 });

    expect(instance.meta.isFirst).toBe(true);
    expect(instance.meta.isLast).toBe(false);

    instance.next();
    expect(instance.meta.isFirst).toBe(false);
    expect(instance.meta.isLast).toBe(true);
  });

  it('should handle batch updates efficiently', async () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const instance = list(data, { limit: 3 });

    instance.batch((ctx) => {
      ctx.setLimit(2);
      ctx.setFilter((x) => x % 2 === 0);
      ctx.setSort((a, b) => b - a);
      ctx.goTo(2);
    });

    expect(instance.current).toEqual([6, 4]);
    expect(instance.meta.page).toBe(2);
    expect(instance.meta.limit).toBe(2);
  });

  it('should handle batch setData', async () => {
    const data = [1, 2, 3];
    const instance = list(data);

    instance.batch((ctx) => {
      ctx.setData?.([7, 8, 9, 10]);
      ctx.setLimit(2);
    });

    expect(instance.current).toEqual([7, 8]);
    expect(instance.meta.page).toBe(1);
  });

  it('should handle custom search function', async () => {
    const data = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }];
    const searchFn = (items: readonly (typeof data)[number][], query: string) =>
      items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));

    const instance = list(data, { searchFn });

    instance.search('bob', { immediate: true });
    expect(instance.current).toEqual([{ name: 'Bob' }]);
  });

  it('should handle custom debounce time', async () => {
    const data = ['apple', 'banana', 'cherry'];
    const searchFn = (items: readonly string[], query: string) => items.filter((item) => item.includes(query));
    const instance = list(data, { debounceMs: 500, searchFn });

    instance.search('ban');

    vi.advanceTimersByTime(300);
    expect(instance.current).toEqual(['apple', 'banana', 'cherry']); // not yet

    vi.advanceTimersByTime(200);
    vi.runAllTimers();
    expect(instance.current).toEqual(['banana']); // after 500ms total
  });

  it('should not mutate original data', async () => {
    const data = [3, 1, 4, 2];
    const instance = list(data);

    instance.setSort((a, b) => a - b);
    expect(instance.current).toEqual([1, 2, 3, 4]);
    expect(data).toEqual([3, 1, 4, 2]); // original unchanged
  });

  it('should handle next/prev at boundaries gracefully', async () => {
    const data = [1, 2, 3];
    const instance = list(data, { limit: 2 });

    instance.prev(); // already at the first page
    expect(instance.current).toEqual([1, 2]);

    instance.goTo(2);
    instance.next(); // already at the last page
    expect(instance.current).toEqual([3]);
  });

  it('should support subscribe/unsubscribe pattern', async () => {
    const data = [1, 2, 3, 4, 5];
    const instance = list(data, { limit: 2 });

    const listener = vi.fn();
    const unsubscribe = instance.subscribe(listener);

    instance.next();
    expect(listener).toHaveBeenCalledTimes(1);

    instance.setLimit(3);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    instance.prev();
    expect(listener).toHaveBeenCalledTimes(2); // not called after unsubscribe
  });

  it('should use default search function when no custom searchFn is provided', () => {
    const data = [
      { email: 'alice@example.com', name: 'Alice' },
      { email: 'bob@example.com', name: 'Bob' },
      { email: 'charlie@test.com', name: 'Charlie' },
    ];

    const instance = list(data);

    // Search should work with the default search function
    instance.search('alice', { immediate: true });
    expect(instance.current).toEqual([{ email: 'alice@example.com', name: 'Alice' }]);

    // Should search across all string fields
    instance.search('example.com', { immediate: true });
    expect(instance.current).toHaveLength(2); // Alice and Bob

    // Should be case-insensitive
    instance.search('CHARLIE', { immediate: true });
    expect(instance.current).toEqual([{ email: 'charlie@test.com', name: 'Charlie' }]);

    // Empty query should return all items
    instance.search('', { immediate: true });
    expect(instance.current).toEqual(data);
  });
});

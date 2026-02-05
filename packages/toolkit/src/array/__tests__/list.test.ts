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

    instance.filter((item) => item % 2 === 0);
    expect(instance.current).toEqual([2, 4, 6]);
    expect(instance.meta.page).toBe(1); // resets to page 1
  });

  it('should sort data using a custom sort function', () => {
    const data = [3, 1, 4, 2];
    const instance = list(data);

    instance.sort((a, b) => a - b);
    expect(instance.current).toEqual([1, 2, 3, 4]);

    instance.sort((a, b) => b - a);
    expect(instance.current).toEqual([4, 3, 2, 1]);

    instance.sort(); // remove sort
    expect(instance.current).toEqual([3, 1, 4, 2]);
  });

  it('should search data with debounce', () => {
    const data = ['apple', 'banana', 'cherry'];
    const searchFn = (items: readonly string[], query: string) =>
      items.filter(item => item.includes(query));
    const instance = list(data, { searchFn });

    instance.search('ban');
    expect(instance.current).toEqual(['apple', 'banana', 'cherry']); // not updated yet

    vi.advanceTimersByTime(300);
    expect(instance.current).toEqual(['banana']);
  });

  it('should search data immediately with searchNow', () => {
    const data = ['apple', 'banana', 'cherry'];
    const searchFn = (items: readonly string[], query: string) =>
      items.filter(item => item.includes(query));
    const instance = list(data, { searchFn });

    instance.searchNow('ban');
    expect(instance.current).toEqual(['banana']); // immediate update
  });

  it('should reset to the initial state', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const instance = list(data, { limit: 2, filterFn: (x) => x > 2 });

    instance.filter((item) => item % 2 === 0);
    // filtered: [2, 4, 6, 8, 10] - with limit 2
    // Page 1: [2, 4], Page 2: [6, 8], Page 3: [10]
    instance.next(); // move to page 2

    expect(instance.meta.page).toBe(2);
    expect(instance.current).toEqual([6, 8]);

    instance.reset();
    // After reset: filterFn is (x > 2), so data becomes [3, 4, 5, 6, 7, 8, 9, 10]
    // Page 1 with limit 2: [3, 4]
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

  it('should iterate over all pages', () => {
    const data = [1, 2, 3, 4, 5, 6];
    const instance = list(data, { limit: 2 });

    const allPages = [...instance];
    expect(allPages).toEqual([[1, 2], [3, 4], [5, 6]]);
  });

  it('should iterate pages using pages() generator', () => {
    const data = [1, 2, 3, 4, 5];
    const instance = list(data, { limit: 2 });

    const allPages = [...instance.pages()];
    expect(allPages).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('should update data dynamically', () => {
    const data = [1, 2, 3];
    const instance = list(data);

    instance.data = [4, 5, 6];
    expect(instance.current).toEqual([4, 5, 6]);
    expect(instance.meta.page).toBe(1); // resets to page 1
  });

  it('should get raw data', () => {
    const data = [1, 2, 3, 4, 5];
    const instance = list(data);

    instance.filter((x) => x > 3);
    expect(instance.current).toEqual([4, 5]);
    expect(instance.data).toEqual([1, 2, 3, 4, 5]); // raw data unchanged
  });

  it('should handle goTo with out-of-bounds page numbers', () => {
    const data = [1, 2, 3, 4, 5, 6];
    const instance = list(data, { limit: 2 });

    instance.goTo(10); // beyond last page
    expect(instance.current).toEqual([5, 6]);

    instance.goTo(-10); // before first page
    expect(instance.current).toEqual([1, 2]);
  });

  it('should handle changing page size dynamically', () => {
    const data = [1, 2, 3, 4, 5, 6];
    const instance = list(data);

    instance.limit = 2;
    expect(instance.current).toEqual([1, 2]);
    expect([...instance.pages()]).toEqual([[1, 2], [3, 4], [5, 6]]);
  });

  it('should check if it is the first or last page', () => {
    const data = [1, 2, 3, 4, 5, 6];
    const instance = list(data, { limit: 5 });

    expect(instance.meta.isFirst).toBe(true);
    expect(instance.meta.isLast).toBe(false);

    instance.next();
    expect(instance.meta.isFirst).toBe(false);
    expect(instance.meta.isLast).toBe(true);
  });

  it('should handle batch updates efficiently', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const instance = list(data, { limit: 3 });

    const result = instance.batch((ctx) => {
      ctx.setLimit(2);
      ctx.setFilter((x) => x % 2 === 0);
      ctx.setSort((a, b) => b - a);
      ctx.goTo(2);
    });

    expect(result).toEqual([6, 4]);
    expect(instance.current).toEqual([6, 4]);
    expect(instance.meta.page).toBe(2);
    expect(instance.meta.limit).toBe(2);
  });

  it('should handle batch setData', () => {
    const data = [1, 2, 3];
    const instance = list(data);

    instance.batch((ctx) => {
      ctx.setData([7, 8, 9, 10]);
      ctx.setLimit(2);
    });

    expect(instance.current).toEqual([7, 8]);
    expect(instance.meta.page).toBe(1);
  });

  it('should handle custom search function', () => {
    const data = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }];
    const searchFn = (items: readonly typeof data[number][], query: string) =>
      items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));

    const instance = list(data, { searchFn });

    instance.searchNow('bob');
    expect(instance.current).toEqual([{ name: 'Bob' }]);
  });

  it('should handle custom debounce time', () => {
    const data = ['apple', 'banana', 'cherry'];
    const searchFn = (items: readonly string[], query: string) =>
      items.filter(item => item.includes(query));
    const instance = list(data, { debounceMs: 500, searchFn });

    instance.search('ban');

    vi.advanceTimersByTime(300);
    expect(instance.current).toEqual(['apple', 'banana', 'cherry']); // not yet

    vi.advanceTimersByTime(200);
    expect(instance.current).toEqual(['banana']); // after 500ms total
  });

  it('should not mutate original data', () => {
    const data = [3, 1, 4, 2];
    const instance = list(data);

    instance.sort((a, b) => a - b);
    expect(instance.current).toEqual([1, 2, 3, 4]);
    expect(data).toEqual([3, 1, 4, 2]); // original unchanged
  });

  it('should handle next/prev at boundaries gracefully', () => {
    const data = [1, 2, 3];
    const instance = list(data, { limit: 2 });

    instance.prev(); // already at first page
    expect(instance.current).toEqual([1, 2]);

    instance.goTo(2);
    instance.next(); // already at last page
    expect(instance.current).toEqual([3]);
  });
});

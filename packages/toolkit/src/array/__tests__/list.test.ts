import { list } from '../list';

describe('list', () => {
  beforeEach(() => {
    vi.useFakeTimers();
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

  it('should filter data based on a predicate', () => {
    const data = [1, 2, 3, 4, 5, 6];
    const instance = list(data);

    instance.filter((item) => item % 2 === 0);
    expect(instance.current).toEqual([2, 4, 6]);
  });

  it('should sort data using a custom sort function', () => {
    const data = [3, 1, 4, 2];
    const instance = list(data);

    instance.sort((a, b) => a - b);
    expect(instance.current).toEqual([1, 2, 3, 4]);
  });

  it('should search data based on a query', () => {
    const data = ['apple', 'banana', 'cherry'];
    const instance = list(data);

    instance.search('ban');

    vi.advanceTimersByTime(300);
    expect(instance.current).toEqual(['banana']);
  });

  it('should reset to the initial state', () => {
    const data = [1, 2, 3, 4, 5, 6];
    const instance = list(data, { limit: 3 });

    instance.filter((item) => item % 2 === 0);
    expect(instance.current).toEqual([2, 4, 6]);

    instance.reset();
    expect(instance.current).toEqual([1, 2, 3]);
  });

  it('should handle empty data', () => {
    const data: number[] = [];
    const instance = list(data);

    expect(instance.current).toEqual([]);
    expect(instance.meta.isEmpty).toBe(true);
  });

  it('should iterate over all pages', () => {
    const data = [1, 2, 3, 4, 5, 6];
    const instance = list(data, { limit: 5 });

    const pages = [...instance];
    expect(pages).toEqual([[1, 2, 3, 4, 5], [6]]);
  });

  it('should update data dynamically', () => {
    const data = [1, 2, 3];
    const instance = list(data);

    instance.data = [4, 5, 6];
    expect(instance.current).toEqual([4, 5, 6]);
  });

  it('should handle invalid page navigation gracefully', () => {
    const data = [1, 2, 3, 4, 5, 6];
    const instance = list(data, { limit: 5 });

    instance.page = 10;
    expect(instance.current).toEqual([6]);
    instance.page = -10;
    expect(instance.current).toEqual([1, 2, 3, 4, 5]);
  });

  it('should handle changing page size dynamically', () => {
    const data = [1, 2, 3, 4, 5, 6];
    const instance = list(data);

    instance.limit = 2;
    expect(instance.current).toEqual([1, 2]);
    expect(instance.pages.length).toBe(3);
  });

  it('should check if it is the first or last page', () => {
    const data = [1, 2, 3, 4, 5, 6];
    const instance = list(data, { limit: 5 });

    expect(instance.meta.isFirst).toBe(true);
    expect(instance.meta.isLast).toBe(false);

    instance.next();
    expect(instance.meta.isLast).toBe(true);
  });
});

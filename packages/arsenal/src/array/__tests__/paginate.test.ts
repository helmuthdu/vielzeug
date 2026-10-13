import { paginate } from '../paginate';

describe('paginate', () => {
  const items = Array.from({ length: 5 }, (_, i) => i + 1);

  it('cuts the requested one-based page and reports the envelope', () => {
    expect(paginate(items, { page: 2, pageSize: 2 })).toEqual({
      items: [3, 4],
      page: 2,
      pageSize: 2,
      totalItems: 5,
      totalPages: 3,
    });
  });

  it('defaults to the first page of the caller base', () => {
    expect(paginate(items, { pageSize: 2 }).items).toEqual([1, 2]);
    expect(paginate(items, { pageOffset: 0, pageSize: 2 }).items).toEqual([1, 2]);
    expect(paginate(items, { page: 0, pageOffset: 0, pageSize: 2 }).items).toEqual([1, 2]);
  });

  it('echoes the requested page in the caller base', () => {
    expect(paginate(items, { page: 0, pageOffset: 0, pageSize: 2 }).page).toBe(0);
    expect(paginate(items, { page: 1, pageOffset: 0, pageSize: 2 }).items).toEqual([3, 4]);
  });

  it('keeps totalPages at 1 for an empty list', () => {
    expect(paginate([], { page: 1, pageSize: 10 })).toEqual({
      items: [],
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 1,
    });
  });

  it('returns empty items past the last page instead of clamping', () => {
    const page = paginate(items, { page: 99, pageSize: 2 });

    expect(page.items).toEqual([]);
    expect(page.page).toBe(99);
    expect(page.totalPages).toBe(3);
  });

  it('reports the envelope independently of the source list', () => {
    const source = [1, 2, 3];
    const page = paginate(source, { pageSize: 2 });
    source.push(4);

    expect(page.items).toEqual([1, 2]);
    expect(page.totalItems).toBe(3);
  });

  it('rejects a non-array, an out-of-base page, and a bad page size', () => {
    expect(() => paginate('nope' as unknown as readonly unknown[])).toThrow(TypeError);
    expect(() => paginate(items, { page: 0 })).toThrow(RangeError);
    expect(() => paginate(items, { page: -1, pageOffset: 0 })).toThrow(RangeError);
    expect(() => paginate(items, { page: 1.5 })).toThrow(RangeError);
    expect(() => paginate(items, { pageSize: 0 })).toThrow(RangeError);
    expect(() => paginate(items, { pageSize: 2.5 })).toThrow(RangeError);
  });
});

import { decodeQuery, encodeQuery } from '../codecs';

describe('codecs', () => {
  it('roundtrips local (page/limit/search) query params', () => {
    const encoded = encodeQuery({ limit: 20, page: 3, search: 'ada' });
    const decoded = decodeQuery(encoded, { defaultLimit: 10 });

    expect(decoded).toEqual({
      limit: 20,
      page: 3,
      search: 'ada',
    });
  });

  it('roundtrips remote (+ filter/sort) query params', () => {
    const encoded = encodeQuery({
      filter: { active: true },
      limit: 5,
      page: 2,
      search: 'issue',
      sort: { by: 'name', dir: 'asc' },
    });
    const decoded = decodeQuery(encoded, { defaultLimit: 10 });

    expect(decoded).toEqual({
      filter: { active: true },
      limit: 5,
      page: 2,
      search: 'issue',
      sort: { by: 'name', dir: 'asc' },
    });
  });

  it('silently drops malformed filter/sort in non-strict mode', () => {
    const decoded = decodeQuery(
      {
        filter: '{"active":',
        limit: '5',
        page: '2',
        sort: '{"by":',
      },
      { defaultLimit: 10 },
    );

    expect(decoded).toEqual({ limit: 5, page: 2 });
    expect('filter' in decoded).toBe(false);
    expect('sort' in decoded).toBe(false);
    expect('search' in decoded).toBe(false);
  });

  it('omits filter, sort, and search keys when params are absent', () => {
    const decoded = decodeQuery({ limit: '5', page: '1' }, { defaultLimit: 10 });

    expect(decoded).toEqual({ limit: 5, page: 1 });
    expect('filter' in decoded).toBe(false);
    expect('sort' in decoded).toBe(false);
    expect('search' in decoded).toBe(false);
  });

  it('throws for malformed filter in strict mode', () => {
    expect(() =>
      decodeQuery({ filter: '{"active":', limit: '5', page: '2' }, { defaultLimit: 10, strict: true }),
    ).toThrow('Invalid query param "filter"');
  });

  it('throws for malformed sort in strict mode', () => {
    expect(() => decodeQuery({ limit: '5', page: '2', sort: '{"by":' }, { defaultLimit: 10, strict: true })).toThrow(
      'Invalid query param "sort"',
    );
  });

  it('encodeQuery omits empty search', () => {
    const params = encodeQuery({ limit: 10, page: 1, search: '' });

    expect('search' in params).toBe(false);
    expect(params.limit).toBe('10');
    expect(params.page).toBe('1');
  });

  it('accepts URLSearchParams as input', () => {
    const sp = new URLSearchParams({ limit: '5', page: '2', search: 'hello' });
    const decoded = decodeQuery(sp, { defaultLimit: 10 });

    expect(decoded).toEqual({ limit: 5, page: 2, search: 'hello' });
  });

  it('URLSearchParams without search omits search key', () => {
    const sp = new URLSearchParams({ limit: '10', page: '1' });
    const decoded = decodeQuery(sp, { defaultLimit: 10 });

    expect(decoded).toEqual({ limit: 10, page: 1 });
    expect('search' in decoded).toBe(false);
  });

  it('URLSearchParams with filter and sort round-trips correctly', () => {
    const sp = new URLSearchParams({
      filter: JSON.stringify({ active: true }),
      limit: '5',
      page: '1',
      sort: JSON.stringify({ by: 'name' }),
    });
    const decoded = decodeQuery(sp, { defaultLimit: 10 });

    expect(decoded).toEqual({
      filter: { active: true },
      limit: 5,
      page: 1,
      sort: { by: 'name' },
    });
  });
});

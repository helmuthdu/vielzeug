import {
  decodeLocalQueryParams,
  decodeRemoteQueryParams,
  decodeRemoteQueryParamsStrict,
  encodeLocalQueryParams,
  encodeRemoteQueryParams,
} from '../codecs';

describe('codecs', () => {
  it('roundtrips local query params', () => {
    const encoded = encodeLocalQueryParams({ limit: 20, page: 3, search: 'ada' });
    const decoded = decodeLocalQueryParams(encoded, 10);

    expect(decoded).toEqual({
      limit: 20,
      page: 3,
      search: 'ada',
    });
  });

  it('roundtrips remote query params', () => {
    const encoded = encodeRemoteQueryParams({
      filter: { active: true },
      limit: 5,
      page: 2,
      search: 'issue',
      sort: { by: 'name', dir: 'asc' },
    });
    const decoded = decodeRemoteQueryParams(encoded, 10);

    expect(decoded).toEqual({
      filter: { active: true },
      limit: 5,
      page: 2,
      search: 'issue',
      sort: { by: 'name', dir: 'asc' },
    });
  });

  it('ignores malformed remote filter/sort in non-strict decode', () => {
    const decoded = decodeRemoteQueryParams(
      {
        filter: '{"active":',
        limit: '5',
        page: '2',
        sort: '{"by":',
      },
      10,
    );

    // Malformed params are silently dropped; keys are omitted entirely (not set to undefined).
    expect(decoded).toEqual({
      limit: 5,
      page: 2,
      search: '',
    });
    expect('filter' in decoded).toBe(false);
    expect('sort' in decoded).toBe(false);
  });

  it('omits filter and sort keys when params are absent', () => {
    const decoded = decodeRemoteQueryParams({ limit: '5', page: '1' }, 10);

    expect(decoded).toEqual({ limit: 5, page: 1, search: '' });
    expect('filter' in decoded).toBe(false);
    expect('sort' in decoded).toBe(false);
  });

  it('throws for malformed remote filter/sort in strict decode', () => {
    expect(() =>
      decodeRemoteQueryParamsStrict(
        {
          filter: '{"active":',
          limit: '5',
          page: '2',
        },
        10,
      ),
    ).toThrow('Invalid query param "filter"');
  });
});

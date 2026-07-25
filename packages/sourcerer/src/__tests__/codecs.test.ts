import { decodeQuery, encodeQuery } from '../codecs';
import { createLocalSource } from '../localSource';

describe('codecs', () => {
  it('round-trips through a real source via decodeQuery + source.patch()', async () => {
    const source = createLocalSource([1, 2, 3, 4, 5], { limit: 2 });

    await source.search('2', { immediate: true });

    const params = encodeQuery(source.query);
    const decoded = decodeQuery(params, { defaultLimit: 2 });
    const restored = createLocalSource([1, 2, 3, 4, 5], { limit: 10 });

    await restored.patch(decoded);

    expect(restored.query).toEqual({ limit: 2, page: 1, search: '2' });
  });

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
      search: 'error',
      sort: { by: 'name', dir: 'asc' },
    });
    const decoded = decodeQuery(encoded, { defaultLimit: 10 });

    expect(decoded).toEqual({
      filter: { active: true },
      limit: 5,
      page: 2,
      search: 'error',
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

  it('uses first value when param is an array', () => {
    const decoded = decodeQuery({ limit: ['5', '10'], page: ['2', '3'] }, { defaultLimit: 20 });

    expect(decoded.limit).toBe(5);
    expect(decoded.page).toBe(2);
  });

  it('uses first value when search is an array', () => {
    const decoded = decodeQuery({ limit: '10', page: '1', search: ['hello', 'world'] }, { defaultLimit: 10 });

    expect(decoded.search).toBe('hello');
  });

  it('falls back to defaults for non-positive or non-integer limit/page', () => {
    const decoded = decodeQuery({ limit: '0', page: '-1' }, { defaultLimit: 15 });

    expect(decoded.limit).toBe(15);
    expect(decoded.page).toBe(1);
  });

  it('warns in dev when limit/page is present but invalid, naming the field and fallback used', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    decodeQuery({ limit: '0', page: '-1' }, { defaultLimit: 15 });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('decodeQuery: limit "0" is not a positive integer'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('decodeQuery: page "-1" is not a positive integer'));

    warnSpy.mockRestore();
  });

  it('sanitizes control characters out of an untrusted param value before logging it', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    decodeQuery({ limit: '\u001b[31mnot-a-number\u001b[0m' }, { defaultLimit: 15 });

    const [message] = warnSpy.mock.calls[0] ?? [];

    expect(message).not.toContain('\u001b');
    expect(message).toContain('decodeQuery: limit');

    warnSpy.mockRestore();
  });

  it('sanitizes control characters out of an untrusted param value in the strict-mode error message', () => {
    let caught: unknown;

    try {
      decodeQuery({ filter: '\u001b[31m{"broken\u001b[0m' }, { strict: true });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).not.toContain('\u001b');
  });

  it('does not warn when limit/page is simply absent — that is the normal, expected case', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    decodeQuery({}, { defaultLimit: 15 });

    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('rejects a fractional limit/page as strictly as any other invalid value (untrusted URL input, unlike a config value)', () => {
    const decoded = decodeQuery({ limit: '2.5', page: '1.9' }, { defaultLimit: 10 });

    expect(decoded).toEqual({ limit: 10, page: 1 });
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

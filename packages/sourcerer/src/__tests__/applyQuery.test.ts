import { applyQuery } from '../applyQuery';
import { decodeQuery, encodeQuery } from '../codecs';
import { createLocalSource } from '../localSource';
import { createRemoteSource } from '../remoteSource';

describe('applyQuery', () => {
  it('delegates to source.patch() with the given changes', async () => {
    const patch = vi.fn().mockResolvedValue(undefined);
    const source = { patch };

    await applyQuery(source, { limit: 10, page: 2 });

    expect(patch).toHaveBeenCalledWith({ limit: 10, page: 2 });
  });

  it('returns the promise from source.patch()', async () => {
    const expected = Promise.resolve();
    const source = { patch: vi.fn().mockReturnValue(expected) };

    expect(applyQuery(source, {})).toBe(expected);
  });

  it('works with a LocalSource — applies limit, page', async () => {
    const source = createLocalSource([1, 2, 3, 4, 5], { limit: 2 });

    await applyQuery(source, { limit: 5 });

    expect(source.meta.pageSize).toBe(5);
    expect(source.current).toEqual([1, 2, 3, 4, 5]);
  });

  it('works with a RemoteSource — applies limit + page in one fetch', async () => {
    const fetch = vi.fn(async () => ({ items: ['a', 'b'], total: 10 }));
    const source = createRemoteSource({ autoFetch: false, fetch, limit: 5 });

    await applyQuery(source, { limit: 10, page: 2 });

    expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, page: 2 }), expect.any(AbortSignal));
  });

  it('round-trips through encodeQuery + decodeQuery', async () => {
    const source = createLocalSource([1, 2, 3, 4, 5], { limit: 2 });

    await source.search('2', { immediate: true });

    const params = encodeQuery(source.query);
    const q = decodeQuery(params, { defaultLimit: 2 });
    const restored = createLocalSource([1, 2, 3, 4, 5], { limit: 10 });

    await applyQuery(restored, q);

    expect(restored.query).toEqual({ limit: 2, page: 1, search: '2' });
  });
});

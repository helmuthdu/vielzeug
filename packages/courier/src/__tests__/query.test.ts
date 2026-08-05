import { describe, expect, it, vi } from 'vitest';

import { CourierDisposedError, createCourier } from '../index';

describe('Courier query cache', () => {
  it('deduplicates explicit query fetches and serves fresh data', async () => {
    const courier = createCourier({ query: { staleTime: 60_000 } });
    const fetch = vi.fn(async () => ({ id: 1 }));
    const definition = { fetch, key: ['user', 1] as const };

    await expect(Promise.all([courier.queries.fetch(definition), courier.queries.fetch(definition)])).resolves.toEqual([
      { id: 1 },
      { id: 1 },
    ]);
    await expect(courier.queries.fetch(definition)).resolves.toEqual({ id: 1 });

    expect(fetch).toHaveBeenCalledOnce();
  });

  it('publishes cache updates to subscribers by key', async () => {
    const courier = createCourier();
    const listener = vi.fn();
    const stop = courier.queries.subscribe(['status'], listener);

    courier.queries.set(['status'], 'ready');
    await courier.queries.fetch({ fetch: async () => 'done', key: ['status'] }, { force: true });
    stop();
    courier.queries.set(['status'], 'next');

    expect(listener).toHaveBeenCalledTimes(3);
    expect(courier.queries.get(['status'])).toBe('next');
  });

  it('marks an exact key and descendants stale before refetching them', async () => {
    const courier = createCourier({ query: { staleTime: 60_000 } });
    const user = { fetch: vi.fn(async () => 'user'), key: ['users', 1] as const };
    const posts = { fetch: vi.fn(async () => 'posts'), key: ['users', 1, 'posts'] as const };

    await Promise.all([courier.queries.fetch(user), courier.queries.fetch(posts)]);
    courier.queries.invalidate(['users', 1]);
    courier.queries.refetchStale();

    await vi.waitFor(() => {
      expect(user.fetch).toHaveBeenCalledTimes(2);
      expect(posts.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('clears cached snapshots without retaining handle state', () => {
    const courier = createCourier();
    const listener = vi.fn();

    courier.queries.set(['users', 1], { id: 1 });
    courier.queries.subscribe(['users', 1], listener);
    courier.queries.clear();

    expect(listener).toHaveBeenCalledOnce();
    expect(courier.queries.getSnapshot(['users', 1])).toBeNull();
    expect(courier.queries.keys()).toEqual([]);
  });

  it('stores synchronous fetch failures as an error snapshot', async () => {
    const courier = createCourier();
    const key = ['sync-throw'] as const;

    await expect(
      courier.queries.fetch({
        fetch: () => {
          throw new Error('boom');
        },
        key,
      }),
    ).rejects.toThrow('boom');

    expect(courier.queries.getSnapshot(key)).toMatchObject({
      error: expect.objectContaining({ message: 'boom' }),
      isFetching: false,
      status: 'error',
    });
  });

  it('rejects query fetches after disposal', async () => {
    const courier = createCourier();

    courier.dispose();

    await expect(courier.queries.fetch({ fetch: async () => 'never', key: ['disposed-query'] })).rejects.toBeInstanceOf(
      CourierDisposedError,
    );
  });
});

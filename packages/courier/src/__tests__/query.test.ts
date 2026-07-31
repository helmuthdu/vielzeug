import { describe, expect, it, vi } from 'vitest';

import { createQueryCache } from '../query';

describe('query handles', () => {
  it('deduplicates work and serves fresh cached data', async () => {
    const cache = createQueryCache({ staleTime: 60_000 });
    const fetch = vi.fn(async () => ({ id: 1 }));
    const query = cache.create({ fetch, key: ['user', 1] });

    await expect(Promise.all([query.fetch(), query.fetch()])).resolves.toEqual([{ id: 1 }, { id: 1 }]);
    await expect(query.fetch()).resolves.toEqual({ id: 1 });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('exposes state changes and detaches only its own subscriptions', async () => {
    const cache = createQueryCache();
    const query = cache.create({ fetch: async () => 'done', key: ['status'] });
    const listener = vi.fn();
    const other = cache.subscribe(['status'], listener);
    const own = query.subscribe(listener);

    await query.fetch();
    query.dispose();
    cache.set(['status'], 'next');

    expect(listener).toHaveBeenCalledTimes(5);
    own();
    other();
  });

  it('marks an exact key and its descendants stale', async () => {
    const cache = createQueryCache({ staleTime: 60_000 });
    const user = cache.create({ fetch: async () => 'user', key: ['users', 1] });
    const posts = cache.create({ fetch: async () => 'posts', key: ['users', 1, 'posts'] });

    await Promise.all([user.fetch(), posts.fetch()]);
    cache.invalidate(['users', 1]);

    expect(user.getSnapshot().updatedAt).toBe(0);
    expect(posts.getSnapshot().updatedAt).toBe(0);
  });

  it('reconnects active handles after clearing the cache', async () => {
    const cache = createQueryCache();
    const fetch = vi.fn(async () => ({ id: 1 }));
    const query = cache.create({ fetch, key: ['users', 1] });
    const listener = vi.fn(() => query.getSnapshot());

    query.subscribe(listener);
    await query.fetch();
    cache.clear();

    expect(query.getSnapshot().status).toBe('loading');
    expect(listener).toHaveBeenCalledTimes(3);
    await expect(query.fetch()).resolves.toEqual({ id: 1 });
    expect(cache.get(['users', 1])).toEqual({ id: 1 });
    expect(cache.keys()).toEqual([['users', 1]]);
  });

  it('reconnects cache subscriptions after clearing the cache', () => {
    const cache = createQueryCache();
    const listener = vi.fn();

    cache.subscribe(['users', 1], listener);
    cache.clear();
    cache.set(['users', 1], { id: 1 });

    expect(listener).toHaveBeenCalledTimes(2);
  });
});

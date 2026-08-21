import { describe, expect, it, vi } from 'vitest';

import { CourierAbortError, CourierDisposedError, createCourier } from '../index';

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

  it('invalidates and refetches matching entries in one call', async () => {
    const courier = createCourier({ query: { staleTime: 60_000 } });
    const user = { fetch: vi.fn(async () => 'user'), key: ['users', 1] as const };
    const posts = { fetch: vi.fn(async () => 'posts'), key: ['users', 1, 'posts'] as const };

    await Promise.all([courier.queries.fetch(user), courier.queries.fetch(posts)]);
    courier.queries.invalidate(['users', 1], { refetch: true });

    await vi.waitFor(() => {
      expect(user.fetch).toHaveBeenCalledTimes(2);
      expect(posts.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('invalidates without refetching when refetch is false', async () => {
    const courier = createCourier({ query: { staleTime: 60_000 } });
    const user = { fetch: vi.fn(async () => 'user'), key: ['users', 1] as const };

    await courier.queries.fetch(user);
    courier.queries.invalidate(['users', 1]);

    expect(user.fetch).toHaveBeenCalledOnce();
    expect(courier.queries.getSnapshot(['users', 1])?.updatedAt).toBe(0);
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

  it('deletes one key and notifies that key subscribers', () => {
    const courier = createCourier();
    const key = ['users', 1] as const;
    const listener = vi.fn();
    const stop = courier.queries.subscribe(key, listener);

    courier.queries.set(key, { id: 1 });
    courier.queries.delete(key);
    courier.queries.delete(key);
    stop();

    expect(listener).toHaveBeenCalledTimes(2);
    expect(courier.queries.getSnapshot(key)).toBeNull();
    expect(courier.queries.keys()).toEqual([]);
  });

  it('aborts in-flight work when deleting the active key', async () => {
    const courier = createCourier();
    const key = ['users', 1] as const;
    let started!: () => void;
    const startedPromise = new Promise<void>((resolve) => {
      started = resolve;
    });

    const request = courier.queries
      .fetch({
        fetch: ({ signal }) =>
          new Promise<string>((_, reject) => {
            started();
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
          }),
        key,
      })
      .catch((error) => error);

    await startedPromise;
    courier.queries.delete(key);

    const result = await request;

    expect(result).toBeInstanceOf(DOMException);
    expect(courier.queries.getSnapshot(key)).toBeNull();
    expect(courier.queries.keys()).toEqual([]);
  });

  it('allows a fresh fetch for the same key immediately after delete', async () => {
    const key = ['users', 1] as const;
    let first = true;
    const fetch = vi.fn<typeof globalThis.fetch>((_, init) => {
      if (first) {
        first = false;
        const signal = init?.signal;

        return new Promise<Response>((_, reject) => {
          if (signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
          }

          signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        });
      }

      return Promise.resolve(
        new Response(JSON.stringify({ id: 1 }), { headers: { 'content-type': 'application/json' } }),
      );
    });
    const courier = createCourier({ fetch });
    const definition = {
      fetch: ({ signal }: { signal: AbortSignal }) =>
        courier.get<{ id: number }>('/users/{id}', { params: { id: 1 }, signal }),
      key,
    };

    const firstRequest = courier.queries.fetch(definition).catch((error) => error);

    courier.queries.delete(key);

    await expect(courier.queries.fetch(definition)).resolves.toEqual({ id: 1 });
    await expect(firstRequest).resolves.toBeInstanceOf(CourierAbortError);
    expect(courier.queries.getSnapshot<{ id: number }>(key)?.status).toBe('success');
    expect(fetch).toHaveBeenCalledTimes(2);
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

  it('starts a fresh fetch after cancelAll, not a stale rejected promise', async () => {
    let firstCall = true;
    const fetch = vi.fn<typeof globalThis.fetch>((_, init) => {
      const signal = init?.signal;
      if (firstCall) {
        firstCall = false;
        return new Promise<Response>((_, reject) => {
          if (signal?.aborted) reject(new DOMException('Aborted', 'AbortError'));
          else signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        });
      }
      return Promise.resolve(new Response('ok', { headers: { 'content-type': 'text/plain' } }));
    });
    const courier = createCourier({ fetch });
    const key = ['test'] as const;
    const def = { fetch: ({ signal }: { signal: AbortSignal }) => courier.get('/test', { signal }), key };

    const first = courier.queries.fetch(def).catch((e) => e);
    courier.cancelAll();
    const second = courier.queries.fetch(def).then(
      () => 'ok',
      (e: unknown) => e,
    );

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult).toBeInstanceOf(Error);
    expect(secondResult).toBe('ok');
    expect(fetch).toHaveBeenCalledTimes(2);

    // Old rejection must not clobber the new fetch's cache state
    await vi.waitFor(() => {
      const snapshot = courier.queries.getSnapshot<string>(key);
      expect(snapshot?.status).toBe('success');
      expect(snapshot?.data).toBe('ok');
    });
    courier.dispose();
  });

  it('garbage-collects entries with no subscribers after gcTime', async () => {
    const courier = createCourier({ query: { gcTime: 50 } });
    const key = ['temp'] as const;

    courier.queries.set(key, 'data');
    expect(courier.queries.get(key)).toBe('data');

    await vi.waitFor(() => {
      expect(courier.queries.get(key)).toBeUndefined();
      expect(courier.queries.keys()).toEqual([]);
    });
  });

  it('does not garbage-collect entries with active subscribers', async () => {
    const courier = createCourier({ query: { gcTime: 50 } });
    const key = ['retained'] as const;

    courier.queries.set(key, 'data');
    const stop = courier.queries.subscribe(key, () => {});

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(courier.queries.get(key)).toBe('data');

    stop();

    await vi.waitFor(() => {
      expect(courier.queries.get(key)).toBeUndefined();
    });
  });

  it('disables GC when gcTime is Infinity', async () => {
    const courier = createCourier({ query: { gcTime: Number.POSITIVE_INFINITY } });
    const key = ['persisted'] as const;

    courier.queries.set(key, 'data');

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(courier.queries.get(key)).toBe('data');
  });
});

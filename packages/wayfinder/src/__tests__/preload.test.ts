import { createMemoryHistory, createRouter, WayfinderDisposedError } from '../';
import { createDeferred, settle } from './test-utils';

describe('preload()', () => {
  it('loads without navigating and reuses the result on navigation', async () => {
    const data = vi.fn(async () => ({ loaded: true }));
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        user: { data, path: '/users/:id' },
      },
    });

    await router.ready;
    const state = await router.preload({ name: 'user', params: { id: '42' } });

    expect(state?.matches.at(-1)?.data).toEqual({ loaded: true });
    expect(router.getSnapshot().location.pathname).toBe('/');

    await router.navigate({ name: 'user', params: { id: '42' } });

    expect(data).toHaveBeenCalledTimes(1);
    expect(router.getSnapshot().matches.at(-1)?.data).toEqual({ loaded: true });
    router.dispose();
  });

  it('deduplicates a navigation against an in-flight preload', async () => {
    const gate = createDeferred<void>();
    const data = vi.fn(async () => {
      await gate.promise;

      return 'ready';
    });
    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: { home: { path: '/' }, page: { data, path: '/page' } },
    });

    await router.ready;
    const preload = router.preload({ name: 'page' });
    await settle();
    const navigation = router.navigate({ name: 'page' });

    gate.resolve();
    await Promise.all([preload, navigation]);

    expect(data).toHaveBeenCalledTimes(1);
    expect(router.getSnapshot().matches.at(-1)?.data).toBe('ready');
    router.dispose();
  });

  it('retries navigation when an in-flight preload fails', async () => {
    const gate = createDeferred<void>();
    const data = vi.fn(async () => {
      if (data.mock.calls.length === 1) {
        await gate.promise;
        throw new Error('preload failed');
      }

      return 'navigation result';
    });
    const router = createRouter({
      history: createMemoryHistory('/'),
      onError: vi.fn(),
      routes: { home: { path: '/' }, page: { data, path: '/page' } },
    });

    await router.ready;
    const preload = router.preload({ name: 'page' }).catch((error) => error);
    const navigation = router.navigate({ name: 'page' });

    gate.resolve();

    await expect(preload).resolves.toBeInstanceOf(Error);
    await navigation;

    expect(data).toHaveBeenCalledTimes(2);
    expect(router.getSnapshot().matches.at(-1)?.data).toBe('navigation result');
    router.dispose();
  });

  it('keys cached data by params and query', async () => {
    const data = vi.fn(async ({ params, query }) => ({ params, query }));
    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: { home: { path: '/' }, search: { data, path: '/search/:scope' } },
    });

    await router.ready;
    await router.preload({ name: 'search', params: { scope: 'all' }, query: { q: 'router' } });
    await router.navigate({ name: 'search', params: { scope: 'all' }, query: { q: 'other' } });

    expect(data).toHaveBeenCalledTimes(2);
    router.dispose();
  });

  it('reports failures and remains retryable', async () => {
    const onError = vi.fn();
    const data = vi.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValueOnce('ready');
    const router = createRouter({
      history: createMemoryHistory('/'),
      onError,
      routes: { home: { path: '/' }, page: { data, path: '/page' } },
    });

    await router.ready;
    await expect(router.preload({ name: 'page' })).rejects.toThrow('temporary');
    await expect(router.preload({ name: 'page' })).resolves.not.toBeNull();

    expect(onError).toHaveBeenCalledWith(expect.any(Error), { source: 'preload' });
    expect(data).toHaveBeenCalledTimes(2);
    router.dispose();
  });

  it('rejects after disposal', async () => {
    const router = createRouter({ history: createMemoryHistory('/'), routes: { home: { path: '/' } } });

    await router.ready;
    router.dispose();

    await expect(router.preload({ name: 'home' })).rejects.toThrow(WayfinderDisposedError);
  });
});

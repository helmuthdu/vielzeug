/**
 * preload() — warm data loaders without navigating.
 */
import { createMemoryHistory, createRouter } from '../';
import { settle } from './test-utils';

describe('preload', () => {
  it('calls data loaders without navigating', async () => {
    const dataFn = vi.fn(async () => ({ prefetched: true }));
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: { data: dataFn, path: '/page' },
      },
    });

    await settle();
    await router.preload('page');

    expect(dataFn).toHaveBeenCalledTimes(1);
    expect(router.getSnapshot().location.pathname).toBe('/');
    router.dispose();
  });

  it('deduplicates concurrent preload calls for the same route', async () => {
    const dataFn = vi.fn(async () => null);
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: { data: dataFn, path: '/page' },
      },
    });

    await settle();
    await Promise.all([router.preload('page'), router.preload('page'), router.preload('page')]);

    expect(dataFn).toHaveBeenCalledTimes(1);
    router.dispose();
  });

  it('passes route params to the data loader', async () => {
    const dataFn = vi.fn(async () => null);
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        user: { data: dataFn, path: '/users/:id' },
      },
    });

    await settle();
    await router.preload('user', { id: '99' } as never);

    expect(dataFn).toHaveBeenCalledWith(expect.objectContaining({ params: { id: '99' } }));
    router.dispose();
  });

  it('is retryable after a failed attempt', async () => {
    let calls = 0;
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      onError: vi.fn(),
      routes: {
        home: { path: '/' },
        page: {
          data: async () => {
            calls++;

            if (calls < 2) throw new Error('temporary failure');

            return { ok: true };
          },
          path: '/page',
        },
      },
    });

    await settle();

    await expect(router.preload('page')).rejects.toThrow('temporary failure');
    // Cache should be cleared after a failure — second call invokes the loader again.
    await router.preload('page');
    expect(calls).toBe(2);
    router.dispose();
  });

  it('reuses preloaded results during the next navigation to that route', async () => {
    let callCount = 0;
    const dataFn = vi.fn(async () => {
      callCount++;

      return { loaded: true };
    });
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: { data: dataFn, path: '/page' },
      },
    });

    await settle();
    await router.preload('page');
    expect(callCount).toBe(1);

    await router.navigate({ path: '/page' });

    // Data loader must NOT be called again — preloaded result was reused.
    expect(callCount).toBe(1);
    expect(router.getSnapshot().matches.at(-1)?.data).toEqual({ loaded: true });
    router.dispose();
  });

  it('rejects the caller without a duplicate unhandled throw when no onError is set', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: {
          data: async () => {
            throw new Error('preload boom');
          },
          path: '/page',
        },
      },
    });

    await settle();

    // Without B1 fix, #reportError queued a microtask throw AND the promise rejected —
    // two error surfaces. Verify the promise rejects with the expected error.
    await expect(router.preload('page')).rejects.toThrow('preload boom');
    router.dispose();
  });

  it('abort signal is aborted when the router is disposed mid-preload', async () => {
    let capturedSignal: AbortSignal | undefined;
    let release: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      release = resolve;
    });
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: {
          data: async ({ signal }: { signal: AbortSignal }) => {
            capturedSignal = signal;
            release?.();
            await new Promise<void>((res) => setTimeout(res, 500));

            return { ok: true };
          },
          path: '/page',
        },
      },
    });

    await settle();

    const preloadPromise = router.preload('page');

    await started;
    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);

    router.dispose();
    await preloadPromise.catch(() => undefined);

    expect(capturedSignal?.aborted).toBe(true);
  });

  it('caches result under the correct key when query is provided and hits on navigation', async () => {
    let callCount = 0;
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        search: {
          data: async () => {
            callCount++;

            return { count: callCount };
          },
          path: '/search',
        },
      },
    });

    await settle();

    // Preload with matching query — navigation should hit the cache.
    await router.preload('search', undefined, { q: 'hello' });
    expect(callCount).toBe(1);

    await router.navigate({ name: 'search', query: { q: 'hello' } });

    expect(callCount).toBe(1);
    expect(router.getSnapshot().matches.at(-1)?.data).toEqual({ count: 1 });
    router.dispose();
  });

  it('navigation with a different query than the preloaded key re-runs the data loader', async () => {
    let callCount = 0;
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        search: {
          data: async () => {
            callCount++;

            return callCount;
          },
          path: '/search',
        },
      },
    });

    await settle();
    // Preload with no query; navigate with ?q=hello — different key, loader must run again.
    await router.preload('search');
    expect(callCount).toBe(1);

    await router.navigate({ name: 'search', query: { q: 'hello' } });

    expect(callCount).toBe(2);
    router.dispose();
  });
});

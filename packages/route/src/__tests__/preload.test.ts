/**
 * preload() — warm data loaders without navigating.
 */
import { createMemoryHistory, createRouter } from '../router';
import { settle } from './test-utils';

describe('preload', () => {
  it('calls data loaders without navigating', async () => {
    const dataFn = vi.fn(async () => ({ prefetched: true }));
    const handler = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: { data: dataFn, handler, path: '/page' },
      },
    });

    await settle();
    await router.preload('page');

    expect(dataFn).toHaveBeenCalledTimes(1);
    // handler must NOT have been called – we didn't navigate
    expect(handler).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe('/');
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
});

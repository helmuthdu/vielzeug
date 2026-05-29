import { createMemoryHistory, createRouter } from '../';
import { createDeferred, settle } from './test-utils';

describe('lazy routes', () => {
  it('loads handler from lazy module on first navigation', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/page');
    const router = createRouter({
      history,
      routes: {
        page: {
          lazy: async () => ({ handler }),
          path: '/page',
        },
      },
    });

    await settle();
    expect(handler).toHaveBeenCalledTimes(1);
    router.dispose();
  });

  it('loads data function from lazy module', async () => {
    const dataFn = vi.fn(async () => ({ loaded: true }));
    const handler = vi.fn();
    const history = createMemoryHistory('/page');
    const router = createRouter({
      history,
      routes: {
        page: {
          lazy: async () => ({ data: dataFn, handler }),
          path: '/page',
        },
      },
    });

    await settle();
    expect(dataFn).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ data: { loaded: true } }));
    router.dispose();
  });

  it('only calls the lazy factory once across multiple navigations', async () => {
    const factory = vi.fn(async () => ({ handler: vi.fn() }));
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: { lazy: factory, path: '/page' },
      },
    });

    await settle();
    await router.navigate({ path: '/page' });
    await router.navigate({ path: '/' });
    await router.navigate({ path: '/page' });

    expect(factory).toHaveBeenCalledTimes(1);
    router.dispose();
  });

  it('lazy meta is picked up in router.getSnapshot().matches', async () => {
    const history = createMemoryHistory('/page');
    const router = createRouter({
      history,
      routes: {
        page: {
          lazy: async () => ({ meta: { title: 'Lazy Page' } }),
          path: '/page',
        },
      },
    });

    await settle();
    expect(router.getSnapshot().matches.at(-1)?.meta).toEqual({ title: 'Lazy Page' });
    router.dispose();
  });

  it('lazy component is picked up in router.getSnapshot().matches', async () => {
    const pageComponent = Symbol('lazy-page-component');
    const history = createMemoryHistory('/page');
    const router = createRouter({
      history,
      routes: {
        page: {
          lazy: async () => ({ component: pageComponent }),
          path: '/page',
        },
      },
    });

    await settle();
    expect(router.getSnapshot().matches.at(-1)?.component).toBe(pageComponent);
    router.dispose();
  });

  it('keeps lazy hydration consistent across overlapping navigations', async () => {
    const { promise: lazyReady, resolve: resolveLazy } = createDeferred<void>();
    const dataFn = vi.fn(async () => ({ loaded: true }));
    const handler = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: {
          lazy: async () => {
            await lazyReady;

            return { data: dataFn, handler };
          },
          path: '/page/:id',
        },
      },
    });

    await settle();

    const first = router.navigate({ path: '/page/a' });
    const second = router.navigate({ path: '/page/b' });

    resolveLazy();

    await Promise.all([first, second]);

    expect(dataFn).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(router.getSnapshot().location.pathname).toBe('/page/b');
    router.dispose();
  });

  it('retries the lazy factory after a failed import', async () => {
    let attempt = 0;
    const handler = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: {
          lazy: async () => {
            attempt++;

            if (attempt === 1) throw new Error('network error');

            return { handler };
          },
          path: '/page',
        },
      },
    });

    await settle();

    // First navigation fails because the lazy factory throws.
    await expect(router.navigate({ path: '/page' })).rejects.toThrow('network error');
    expect(attempt).toBe(1);
    expect(handler).not.toHaveBeenCalled();

    // Second navigation retries; record must not be permanently poisoned.
    await router.navigate({ path: '/page' });
    expect(attempt).toBe(2);
    expect(handler).toHaveBeenCalledTimes(1);
    router.dispose();
  });

  it('dispose during in-flight navigation stops state updates', async () => {
    // Use a data loader so timing is controlled via settle() rather than
    // synchronising with internal microtask scheduling in #hydrateLazy.
    let resolveData!: (v: unknown) => void;
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: {
          data: () =>
            new Promise<unknown>((resolve) => {
              resolveData = resolve;
            }),
          path: '/page',
        },
      },
    });

    await settle();

    const nav = router.navigate({ path: '/page' });

    // Let the navigation reach the data-loading phase before we dispose.
    await settle();

    router.dispose();
    resolveData({ ok: true });

    await nav.catch(() => undefined);

    // After dispose, the router is dead; subscriptions must throw.
    expect(() => router.subscribe(vi.fn())).toThrow('[route] Router is disposed');
  });
});

/**
 * notFound option — fallback route when no path matches.
 */
import { createMemoryHistory, createRouter } from '../';
import { settle } from './test-utils';

describe('notFound option', () => {
  it('loads notFound data when no route matches', async () => {
    const dataFn = vi.fn(async () => ({ fallback: true }));
    const history = createMemoryHistory('/missing');
    const router = createRouter({
      history,
      notFound: { data: dataFn },
      routes: { home: { path: '/' } },
    });

    await settle();

    const leaf = router.getSnapshot().matches.at(-1);

    expect(leaf?.data).toEqual({ fallback: true });
    expect(router.getSnapshot().status).toBe('idle');
    router.dispose();
  });

  it('notFound.data receives the unmatched pathname', async () => {
    const dataFn = vi.fn(async ({ pathname }: { pathname: string }) => ({ requestedPath: pathname }));
    const history = createMemoryHistory('/unknown/path');
    const router = createRouter({
      history,
      notFound: { data: dataFn },
      routes: { home: { path: '/' } },
    });

    await settle();

    expect(dataFn).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/unknown/path' }));
    expect(router.getSnapshot().matches.at(-1)?.data).toEqual({ requestedPath: '/unknown/path' });
    router.dispose();
  });

  it('notFound.middleware can redirect to another route', async () => {
    const loginData = vi.fn();
    const history = createMemoryHistory('/missing');
    const router = createRouter({
      history,
      notFound: {
        middleware: [
          async (ctx) => {
            await ctx.navigate({ name: 'login' });
          },
        ],
      },
      routes: {
        home: { path: '/' },
        login: { data: loginData, path: '/login' },
      },
    });

    await settle();

    expect(loginData).toHaveBeenCalled();
    expect(router.getSnapshot().location.pathname).toBe('/login');
    router.dispose();
  });

  it('applies global coerceSearch to the query in the notFound handler', async () => {
    const dataFn = vi.fn(async ({ query }: { query: Record<string, unknown> }) => query);
    const history = createMemoryHistory('/missing?page=3');
    const router = createRouter({
      coerceSearch: (raw) => ({ page: Number(raw.page ?? 1) }),
      history,
      notFound: { data: dataFn },
      routes: { home: { path: '/' } },
    });

    await settle();

    expect(dataFn).toHaveBeenCalledWith(expect.objectContaining({ query: { page: 3 } }));
    router.dispose();
  });

  it('resolves declared and fallback views through an exhaustive registry', async () => {
    const history = createMemoryHistory('/missing');
    const router = createRouter({
      history,
      notFound: {},
      routes: {
        home: { path: '/' },
        legacy: { path: '/legacy', redirect: { name: 'settings' } },
        settings: { path: '/settings' },
      },
    });
    const views = router.createViewRegistry({ home: 'home-view', settings: 'settings-view' } as const, {
      notFound: 'not-found-view' as const,
    });

    await router.ready;

    expect(views.resolve(router.getSnapshot())).toBe('not-found-view');

    await router.navigate({ name: 'settings' });

    expect(views.resolve(router.getSnapshot())).toBe('settings-view');
    expectTypeOf(views.resolve).returns.toEqualTypeOf<'home-view' | 'not-found-view' | 'settings-view' | undefined>();
    router.dispose();
  });

  it('leaves state idle with empty matches when no notFound option and no route matches', async () => {
    const history = createMemoryHistory('/missing');
    const router = createRouter({
      history,
      routes: { home: { path: '/' } },
    });

    await settle();

    expect(router.getSnapshot().status).toBe('idle');
    expect(router.getSnapshot().matches).toHaveLength(0);
    router.dispose();
  });
});

/**
 * notFound option — fallback route when no path matches.
 */
import { createMemoryHistory, createRouter } from '../';
import { settle } from './test-utils';

describe('notFound option', () => {
  it('renders the notFound component when no route matches', async () => {
    const NotFoundPage = Symbol('not-found-page');
    const history = createMemoryHistory('/missing');
    const router = createRouter({
      history,
      notFound: { component: NotFoundPage },
      routes: { home: { path: '/' } },
    });

    await settle();

    const leaf = router.getSnapshot().matches.at(-1);

    expect(leaf?.component).toBe(NotFoundPage);
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

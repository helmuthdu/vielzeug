import { createMemoryHistory, createRouter } from '../router';

async function settle(): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, 10));
}

describe('declarative redirect', () => {
  it('redirects to the target route on match', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/old');
    const router = createRouter({
      history,
      routes: {
        new: { handler, path: '/new' },
        old: { path: '/old', redirect: { path: '/new' } },
      },
    });

    await settle();
    expect(router.state.location.pathname).toBe('/new');
    expect(handler).toHaveBeenCalled();
    router.dispose();
  });

  it('redirects using a named route target', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/legacy');
    const router = createRouter({
      history,
      routes: {
        current: { handler, path: '/current' },
        legacy: { path: '/legacy', redirect: { name: 'current' } },
      },
    });

    await settle();
    expect(router.state.location.pathname).toBe('/current');
    expect(handler).toHaveBeenCalled();
    router.dispose();
  });

  it('uses replaceState so the original URL is not in browser history', async () => {
    const replaceCount = { n: 0 };
    const history = createMemoryHistory('/old');
    const origReplace = history.replace.bind(history);

    history.replace = (url, state) => {
      replaceCount.n++;
      origReplace(url, state);
    };

    const router = createRouter({
      history,
      routes: {
        new: { handler: vi.fn(), path: '/new' },
        old: { path: '/old', redirect: { path: '/new' } },
      },
    });

    await settle();
    expect(replaceCount.n).toBeGreaterThanOrEqual(1);
    router.dispose();
  });

  it('throws when a redirect loop is detected', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        a: { path: '/a', redirect: { path: '/b' } },
        b: { path: '/b', redirect: { path: '/a' } },
        home: { path: '/' },
      },
    });

    await settle();
    await expect(router.navigate({ path: '/a' })).rejects.toThrow('Redirect loop detected');
    router.dispose();
  });

  it('does not run beforeLeave blockers for declarative redirects', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/old');
    const router = createRouter({
      history,
      routes: {
        new: { handler, path: '/new' },
        old: { path: '/old', redirect: { path: '/new' } },
      },
    });

    router.beforeLeave(async () => false);
    await settle();

    expect(router.state.location.pathname).toBe('/new');
    expect(handler).toHaveBeenCalled();
    router.dispose();
  });
});

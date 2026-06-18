import { createMemoryHistory, createRouter } from '../';
import { settle } from './test-utils';

describe('declarative redirect', () => {
  it('redirects to the target route on match', async () => {
    const data = vi.fn();
    const history = createMemoryHistory('/old');
    const router = createRouter({
      history,
      routes: {
        new: { data, path: '/new' },
        old: { path: '/old', redirect: { path: '/new' } },
      },
    });

    await settle();
    expect(router.getSnapshot().location.pathname).toBe('/new');
    expect(data).toHaveBeenCalled();
    router.dispose();
  });

  it('redirects using a named route target', async () => {
    const data = vi.fn();
    const history = createMemoryHistory('/legacy');
    const router = createRouter({
      history,
      routes: {
        current: { data, path: '/current' },
        legacy: { path: '/legacy', redirect: { name: 'current' } },
      },
    });

    await settle();
    expect(router.getSnapshot().location.pathname).toBe('/current');
    expect(data).toHaveBeenCalled();
    router.dispose();
  });

  it('uses replaceState so the original URL is not in browser history', async () => {
    const replaceCount = { n: 0 };
    const history = createMemoryHistory('/old');
    const origReplace = history.replace.bind(history);

    history.replace = (url: string, state: unknown) => {
      replaceCount.n++;
      origReplace(url, state);
    };

    const router = createRouter({
      history,
      routes: {
        new: { data: vi.fn(), path: '/new' },
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
    const data = vi.fn();
    const history = createMemoryHistory('/old');
    const router = createRouter({
      history,
      routes: {
        new: { data, path: '/new' },
        old: { path: '/old', redirect: { path: '/new' } },
      },
    });

    router.beforeLeave(async () => false);
    await settle();

    expect(router.getSnapshot().location.pathname).toBe('/new');
    expect(data).toHaveBeenCalled();
    router.dispose();
  });

  it('throws after 5 consecutive declarative redirects (depth>=5 boundary)', async () => {
    // #commitRedirect throws when depth >= 5. Each redirect hop increments depth by 1.
    // To trigger the guard: 6 chained redirects (depth 0→1→2→3→4→5 throws on the 6th call).
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        a: { path: '/a', redirect: { path: '/b' } },
        b: { path: '/b', redirect: { path: '/c' } },
        c: { path: '/c', redirect: { path: '/d' } },
        d: { path: '/d', redirect: { path: '/e' } },
        e: { path: '/e', redirect: { path: '/f' } },
        f: { path: '/f', redirect: { path: '/g' } },
        g: { path: '/g' },
        home: { path: '/' },
      },
    });

    await settle();
    await expect(router.navigate({ path: '/a' })).rejects.toThrow('Redirect loop detected');
    router.dispose();
  });

  it('resolves a named redirect target relative to the router base', async () => {
    const data = vi.fn();
    const history = createMemoryHistory('/app/old');
    const router = createRouter({
      base: '/app',
      history,
      routes: {
        current: { data, path: '/current' },
        legacy: { path: '/old', redirect: { name: 'current' } },
      },
    });

    await settle();
    expect(router.getSnapshot().location.pathname).toBe('/current');
    expect(data).toHaveBeenCalled();
    router.dispose();
  });
});

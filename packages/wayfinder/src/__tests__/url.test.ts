/**
 * router.url() — named-route URL construction.
 */
import { createMemoryHistory, createRouter, RouterDisposedError } from '../';
import { settle } from './test-utils';

describe('url()', () => {
  it('builds a URL for a static route', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { about: { path: '/about' }, home: { path: '/' } },
    });

    await settle();

    expect(router.url('about')).toBe('/about');
    router.dispose();
  });

  it('interpolates path params', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, user: { path: '/users/:id' } },
    });

    await settle();

    expect(router.url('user', { id: '42' })).toBe('/users/42');
    router.dispose();
  });

  it('encodes special characters in path params', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, user: { path: '/users/:id' } },
    });

    await settle();

    expect(router.url('user', { id: 'hello world' })).toBe('/users/hello%20world');
    router.dispose();
  });

  it('appends a query string when query params are provided', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, search: { path: '/search' } },
    });

    await settle();

    const result = router.url('search', undefined, { page: 2, q: 'foo' });

    expect(result).toContain('/search');
    expect(result).toContain('q=foo');
    expect(result).toContain('page=2');
    router.dispose();
  });

  it('prepends the router base', async () => {
    const history = createMemoryHistory('/app/');
    const router = createRouter({
      base: '/app',
      history,
      routes: { home: { path: '/' }, page: { path: '/page' } },
    });

    await settle();

    expect(router.url('page')).toBe('/app/page');
    router.dispose();
  });

  it('throws for an unknown route name', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' } },
    });

    await settle();

    expect(() => router.url('nonexistent' as never)).toThrow('[wayfinder] Unknown route name');
    router.dispose();
  });

  it('throws when a required path param is missing', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, user: { path: '/users/:id' } },
    });

    await settle();

    expect(() => router.url('user', {} as never)).toThrow('[wayfinder] Missing path param');
    router.dispose();
  });
});

describe('Symbol.dispose', () => {
  it('disposes the router via Symbol.dispose protocol', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' } },
    });

    await settle();

    router[Symbol.dispose]();

    // subscribe() guards against post-dispose use
    expect(() => router.subscribe(vi.fn())).toThrow(RouterDisposedError);
    // getSnapshot() is intentionally still readable post-dispose (useSyncExternalStore teardown)
    expect(() => router.getSnapshot()).not.toThrow();
  });
});

describe('disposalSignal', () => {
  it('starts as a live (non-aborted) signal', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({ history, routes: { home: { path: '/' } } });

    await settle();

    expect(router.disposalSignal.aborted).toBe(false);
    expect(router.disposed).toBe(false);

    router.dispose();
  });

  it('fires with RouterDisposedError reason when router is disposed', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({ history, routes: { home: { path: '/' } } });

    await settle();

    const signal = router.disposalSignal;

    router.dispose();

    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBeInstanceOf(RouterDisposedError);
    expect(router.disposed).toBe(true);
  });

  it('disposalSignal aborts are idempotent — calling dispose() twice does not re-abort', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({ history, routes: { home: { path: '/' } } });

    await settle();

    router.dispose();
    router.dispose();

    expect(router.disposed).toBe(true);
    expect(router.disposalSignal.aborted).toBe(true);
  });
});

describe('malformed URL segments', () => {
  it('returns the raw value when a path param contains a malformed percent-encoding', async () => {
    const history = createMemoryHistory('/items/%GG');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, item: { path: '/items/:id' } },
    });

    await settle();

    // %GG is not a valid percent-encoded sequence; router should not throw.
    // The raw segment is surfaced as-is.
    expect(router.getSnapshot().matches.at(-1)?.params).toEqual({ id: '%GG' });
    router.dispose();
  });
});

describe('locals reset per navigation', () => {
  it('locals is an empty object at the start of each new navigation', async () => {
    const localsSnapshots: Array<Record<string, unknown>> = [];
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      middleware: [
        async (ctx, next) => {
          localsSnapshots.push({ ...ctx.locals });
          ctx.locals.visited = true;
          await next();
        },
      ],
      routes: {
        about: { path: '/about' },
        home: { path: '/' },
      },
    });

    await settle();
    await router.navigate({ path: '/about' });

    // Both navigations must start with an empty locals — not carry over from previous.
    expect(localsSnapshots[0]).toEqual({});
    expect(localsSnapshots[1]).toEqual({});
    router.dispose();
  });
});

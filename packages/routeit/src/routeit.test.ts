import type { Middleware, Router } from './routeit';
import { createRouter, type RouteContext } from './routeit';

/** -------------------- Test Setup -------------------- **/

const mockLocation = {
  hash: '',
  pathname: '/',
  search: '',
};

const mockHistory = {
  back: vi.fn(),
  forward: vi.fn(),
  go: vi.fn(),
  // Simulate real browser behaviour: pushState/replaceState update the current URL.
  // Without this, navigate() would re-read the old pathname from the mock and recurse
  // indefinitely when a middleware calls router.navigate() without awaiting next().
  pushState: vi.fn((_state: unknown, _title: string, url: string) => {
    mockLocation.pathname = url;
  }),
  replaceState: vi.fn((_state: unknown, _title: string, url: string) => {
    mockLocation.pathname = url;
  }),
};

Object.defineProperty(window, 'location', { value: mockLocation, writable: true });
Object.defineProperty(window, 'history', { value: mockHistory, writable: true });

/** -------------------- Helpers -------------------- **/

/** Starts the router and waits for the initial route handling to complete. */
async function boot(router: Router): Promise<Router> {
  router.start();
  await new Promise<void>((r) => setTimeout(r, 10));
  return router;
}

/** -------------------- Tests -------------------- **/

describe('Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.pathname = '/';
    mockLocation.search = '';
    mockLocation.hash = '';
  });

  /** -------------------- createRouter() -------------------- **/

  describe('createRouter()', () => {
    it('creates a router with default options', () => {
      const router = createRouter();
      expect(router).toBeDefined();
      expect(typeof router.navigate).toBe('function');
    });

    it('supports history mode', () => {
      const router = createRouter({ mode: 'history' });
      router.navigate('/about');
      expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/about');
    });

    it('supports hash mode', async () => {
      const handler = vi.fn();
      mockLocation.hash = '#/about';
      await boot(createRouter({ mode: 'hash' }).on('/about', handler));
      expect(handler).toHaveBeenCalled();
    });

    it('normalizes base path (strips trailing slash)', () => {
      const router = createRouter({ base: '/app/' });
      expect(router.url('/users')).toBe('/app/users');
    });

    it('prepends base to navigation targets', () => {
      createRouter({ base: '/app', mode: 'history' }).navigate('/users');
      expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/app/users');
    });

    it('strips base prefix when matching routes', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/app/about';
      await boot(createRouter({ base: '/app' }).on('/about', handler));
      expect(handler).toHaveBeenCalled();
    });

    it('accepts onNotFound and onError hooks without error', () => {
      const router = createRouter({ onError: vi.fn(), onNotFound: vi.fn() });
      expect(router).toBeDefined();
    });

    it('accepts global middleware at construction', () => {
      const mw: Middleware = async (_ctx, next) => next();
      const router = createRouter({ middleware: mw });
      expect(router).toBeDefined();
    });
  });

  /** -------------------- route() / routes() / on() -------------------- **/

  describe('route() / routes() / on()', () => {
    let router: Router;

    beforeEach(() => {
      router = createRouter();
    });

    it('route() is chainable', () => {
      expect(router.route({ handler: vi.fn(), path: '/' })).toBe(router);
    });

    it('routes() registers multiple routes at once and is chainable', () => {
      expect(
        router.routes([
          { handler: vi.fn(), path: '/' },
          { handler: vi.fn(), path: '/about' },
        ]),
      ).toBe(router);
    });

    it('on() is chainable', () => {
      expect(router.on('/', vi.fn())).toBe(router);
    });

    it('on() accepts name and middleware as extras', () => {
      router.on('/posts/:id', vi.fn(), { name: 'postDetail' });
      expect(router.url('postDetail', { id: '99' })).toBe('/posts/99');
    });

    it('route() works without a handler (middleware-only route)', async () => {
      const mw = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => next());
      mockLocation.pathname = '/hook';
      await boot(router.route({ middleware: mw, path: '/hook' }));
      expect(mw).toHaveBeenCalled();
    });

    it('registers a named route and resolves it via url()', () => {
      router.route({ handler: vi.fn(), name: 'userDetail', path: '/users/:id' });
      expect(router.url('userDetail', { id: '123' })).toBe('/users/123');
    });

    it('silently overwrites a duplicate named route (last registration wins)', () => {
      router.route({ handler: vi.fn(), name: 'home', path: '/' });
      router.route({ handler: vi.fn(), name: 'home', path: '/home' });
      expect(() => router.url('home')).not.toThrow();
    });
  });

  /** -------------------- group() -------------------- **/

  describe('group()', () => {
    let router: Router;

    beforeEach(() => {
      router = createRouter();
    });

    it('is chainable', () => {
      expect(router.group('/a', (r) => r.on('/x', vi.fn()))).toBe(router);
    });

    it('prefixes every route in the group', async () => {
      const handler = vi.fn();
      router.group('/admin', (r) => r.on('/dashboard', handler));
      mockLocation.pathname = '/admin/dashboard';
      await boot(router);
      expect(handler).toHaveBeenCalled();
    });

    it('does not match routes with the prefix missing', async () => {
      const handler = vi.fn();
      router.group('/admin', (r) => r.on('/dashboard', handler));
      mockLocation.pathname = '/dashboard';
      await boot(router);
      expect(handler).not.toHaveBeenCalled();
    });

    it('applies an array of middleware to every route in the group', async () => {
      const calls: string[] = [];
      const auth: Middleware = async (_ctx, next) => {
        calls.push('auth');
        await next();
      };
      router.group('/admin', [auth], (r) => {
        r.on('/users', () => {
          calls.push('users');
        });
      });
      mockLocation.pathname = '/admin/users';
      await boot(router);
      expect(calls).toEqual(['auth', 'users']);
    });

    it('accepts a single middleware (not wrapped in an array)', async () => {
      const calls: string[] = [];
      const auth: Middleware = async (_ctx, next) => {
        calls.push('auth');
        await next();
      };
      router.group('/secure', auth, (r) => {
        r.on('/data', () => {
          calls.push('data');
        });
      });
      mockLocation.pathname = '/secure/data';
      await boot(router);
      expect(calls).toEqual(['auth', 'data']);
    });

    it('group middleware runs before route-level middleware', async () => {
      const calls: string[] = [];
      router.group(
        '/api',
        [
          async (_ctx, next) => {
            calls.push('group');
            await next();
          },
        ],
        (r) => {
          r.route({
            handler: () => {
              calls.push('handler');
            },
            middleware: async (_ctx, next) => {
              calls.push('route');
              await next();
            },
            path: '/data',
          });
        },
      );
      mockLocation.pathname = '/api/data';
      await boot(router);
      expect(calls).toEqual(['group', 'route', 'handler']);
    });

    it('route() inside a group supports named routes', () => {
      router.group('/users', (r) => {
        r.route({ handler: vi.fn(), name: 'userDetail', path: '/:id' });
      });
      expect(router.url('userDetail', { id: '99' })).toBe('/users/99');
    });
  });

  /** -------------------- Path Matching -------------------- **/

  describe('Path matching', () => {
    let router: Router;

    beforeEach(() => {
      router = createRouter();
    });

    it('matches root path', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/';
      await boot(router.on('/', handler));
      expect(handler).toHaveBeenCalled();
    });

    it('matches static paths', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/about';
      await boot(router.on('/about', handler));
      expect(handler).toHaveBeenCalled();
    });

    it('extracts a single path parameter', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/users/123';
      await boot(router.on('/users/:id', handler));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { id: '123' } }));
    });

    it('extracts multiple path parameters', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/users/123/posts/456';
      await boot(router.on('/users/:userId/posts/:postId', handler));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { postId: '456', userId: '123' } }));
    });

    it('URL-decodes path parameters (%20 => space)', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/search/hello%20world';
      await boot(router.on('/search/:query', handler));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { query: 'hello world' } }));
    });

    it('URL-decodes path parameters (%2B => +)', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/search/hello%2Bworld';
      await boot(router.on('/search/:query', handler));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { query: 'hello+world' } }));
    });

    it('matches wildcard paths', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/docs/guide/intro';
      await boot(router.on('/docs/*', handler));
      expect(handler).toHaveBeenCalled();
    });

    it('does not match an unrelated path', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/about';
      await boot(router.on('/contact', handler));
      expect(handler).not.toHaveBeenCalled();
    });

    it('matches only the first registered route when multiple match', async () => {
      const first = vi.fn();
      const second = vi.fn();
      mockLocation.pathname = '/test';
      await boot(router.on('/test', first).on('/test', second));
      expect(first).toHaveBeenCalled();
      expect(second).not.toHaveBeenCalled();
    });

    it('treats an empty pathname as root', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '';
      await boot(router.on('/', handler));
      expect(handler).toHaveBeenCalled();
    });
  });

  /** -------------------- Query Parameters -------------------- **/

  describe('Query parameters', () => {
    let router: Router;

    beforeEach(() => {
      router = createRouter();
      mockLocation.pathname = '/search';
    });

    it('parses a single query parameter', async () => {
      const handler = vi.fn();
      mockLocation.search = '?q=test';
      await boot(router.on('/search', handler));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: { q: 'test' } }));
    });

    it('parses multiple query parameters', async () => {
      const handler = vi.fn();
      mockLocation.search = '?q=test&page=2&limit=10';
      await boot(router.on('/search', handler));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: { limit: '10', page: '2', q: 'test' } }));
    });

    it('parses repeated keys as an array', async () => {
      const handler = vi.fn();
      mockLocation.search = '?tags=a&tags=b&tags=c';
      await boot(router.on('/search', handler));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: { tags: ['a', 'b', 'c'] } }));
    });

    it('returns an empty object when no query string is present', async () => {
      const handler = vi.fn();
      mockLocation.search = '';
      await boot(router.on('/search', handler));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: {} }));
    });

    it('handles keys with empty values', async () => {
      const handler = vi.fn();
      mockLocation.search = '?q=&page=2';
      await boot(router.on('/search', handler));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: { page: '2', q: '' } }));
    });
  });

  /** -------------------- Route Context -------------------- **/

  describe('Route context', () => {
    let router: Router;

    beforeEach(() => {
      router = createRouter();
    });

    it('provides params, query, pathname, hash, and empty meta', async () => {
      let ctx: RouteContext | undefined;
      mockLocation.pathname = '/users/7';
      mockLocation.search = '?tab=info';
      mockLocation.hash = '#section';
      await boot(
        router.on('/users/:id', (c) => {
          ctx = c;
        }),
      );
      expect(ctx?.params).toEqual({ id: '7' });
      expect(ctx?.query).toEqual({ tab: 'info' });
      expect(ctx?.pathname).toBe('/users/7');
      expect(ctx?.hash).toBe('section');
      expect(ctx?.meta).toEqual({});
    });

    it('provides custom data attached to the route definition', async () => {
      let ctx: RouteContext<{ title: string }> | undefined;
      mockLocation.pathname = '/about';
      await boot(
        router.route({
          data: { title: 'About' },
          handler: (c) => {
            ctx = c;
          },
          path: '/about',
        }),
      );
      expect(ctx?.data).toEqual({ title: 'About' });
    });

    it('does not expose a navigate property on the context', async () => {
      let ctx: RouteContext | undefined;
      mockLocation.pathname = '/';
      await boot(
        router.on('/', (c) => {
          ctx = c;
        }),
      );
      expect('navigate' in (ctx as object)).toBe(false);
    });
  });

  /** -------------------- Middleware -------------------- **/

  describe('Middleware', () => {
    let router: Router;

    beforeEach(() => {
      router = createRouter();
      mockLocation.pathname = '/test';
    });

    it('executes a single middleware before the handler', async () => {
      const calls: string[] = [];
      router.route({
        handler: () => {
          calls.push('handler');
        },
        middleware: async (_ctx, next) => {
          calls.push('mw');
          await next();
        },
        path: '/test',
      });
      await boot(router);
      expect(calls).toEqual(['mw', 'handler']);
    });

    it('executes an array of middleware in declaration order', async () => {
      const calls: string[] = [];
      router.route({
        handler: () => {
          calls.push('handler');
        },
        middleware: [
          async (_ctx, next) => {
            calls.push('m1');
            await next();
          },
          async (_ctx, next) => {
            calls.push('m2');
            await next();
          },
        ],
        path: '/test',
      });
      await boot(router);
      expect(calls).toEqual(['m1', 'm2', 'handler']);
    });

    it('blocks the handler when middleware does not call next()', async () => {
      const handler = vi.fn();
      router.route({
        handler,
        middleware: async () => {
          /* intentionally blocked */
        },
        path: '/test',
      });
      await boot(router);
      expect(handler).not.toHaveBeenCalled();
    });

    it('allows middleware to mutate ctx.meta for downstream use', async () => {
      let meta: unknown;
      router.route({
        handler: (ctx) => {
          meta = ctx.meta;
        },
        middleware: async (ctx, next) => {
          ctx.meta = { user: { id: '1' } };
          await next();
        },
        path: '/test',
      });
      await boot(router);
      expect(meta).toEqual({ user: { id: '1' } });
    });

    it('supports async middleware with awaited work before calling next()', async () => {
      const calls: string[] = [];
      router.route({
        handler: () => {
          calls.push('handler');
        },
        middleware: async (_ctx, next) => {
          calls.push('before');
          await new Promise<void>((r) => setTimeout(r, 5));
          calls.push('after');
          await next();
        },
        path: '/test',
      });
      router.start();
      await new Promise<void>((r) => setTimeout(r, 20));
      expect(calls).toEqual(['before', 'after', 'handler']);
    });

    it('allows middleware to redirect by calling navigate() without next()', async () => {
      const protectedHandler = vi.fn();
      router.route({
        handler: protectedHandler,
        middleware: async () => {
          router.navigate('/login');
        },
        path: '/protected',
      });
      router.on('/login', vi.fn());
      mockLocation.pathname = '/protected';
      await boot(router);
      expect(protectedHandler).not.toHaveBeenCalled();
      expect(mockHistory.pushState).toHaveBeenCalled();
    });
  });

  /** -------------------- Global Middleware -------------------- **/

  describe('Global middleware', () => {
    it('runs before every route handler', async () => {
      const calls: string[] = [];
      const router = createRouter({
        middleware: async (_ctx, next) => {
          calls.push('global');
          await next();
        },
      });
      router.on('/a', () => {
        calls.push('a');
      });
      router.on('/b', () => {
        calls.push('b');
      });

      mockLocation.pathname = '/a';
      await boot(router);
      expect(calls).toEqual(['global', 'a']);

      calls.length = 0;
      mockLocation.pathname = '/b';
      await router.navigate('/b');
      expect(calls).toEqual(['global', 'b']);
    });

    it('runs before route-level middleware', async () => {
      const calls: string[] = [];
      const router = createRouter({
        middleware: async (_ctx, next) => {
          calls.push('global');
          await next();
        },
      });
      router.route({
        handler: () => {
          calls.push('handler');
        },
        middleware: async (_ctx, next) => {
          calls.push('route');
          await next();
        },
        path: '/test',
      });
      mockLocation.pathname = '/test';
      await boot(router);
      expect(calls).toEqual(['global', 'route', 'handler']);
    });

    it('supports multiple global middleware supplied as an array', async () => {
      const calls: string[] = [];
      const router = createRouter({
        middleware: [
          async (_ctx, next) => {
            calls.push('g1');
            await next();
          },
          async (_ctx, next) => {
            calls.push('g2');
            await next();
          },
        ],
      });
      router.on('/test', () => {
        calls.push('handler');
      });
      mockLocation.pathname = '/test';
      await boot(router);
      expect(calls).toEqual(['g1', 'g2', 'handler']);
    });
  });

  /** -------------------- Error Handling -------------------- **/

  describe('Error handling', () => {
    it('logs error to console when no onError handler is provided - handler is not called', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const handler = vi.fn();
      const router = createRouter();
      router.route({
        handler,
        middleware: async () => {
          throw new Error('boom');
        },
        path: '/test',
      });
      mockLocation.pathname = '/test';
      await boot(router);
      expect(handler).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('[Router] Route handling error:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('calls onError with the thrown error and route context', async () => {
      const onError = vi.fn();
      const router = createRouter({ onError });
      router.route({
        handler: vi.fn(),
        middleware: async () => {
          throw new Error('boom');
        },
        path: '/test',
      });
      mockLocation.pathname = '/test';
      await boot(router);
      expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ pathname: '/test' }));
    });
  });

  /** -------------------- onNotFound -------------------- **/

  describe('onNotFound', () => {
    it('calls onNotFound when no route matches', async () => {
      const onNotFound = vi.fn();
      const router = createRouter({ onNotFound });
      router.on('/', vi.fn());
      mockLocation.pathname = '/does-not-exist';
      await boot(router);
      expect(onNotFound).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/does-not-exist' }));
    });

    it('does not call onNotFound when a route matches', async () => {
      const onNotFound = vi.fn();
      const handler = vi.fn();
      const router = createRouter({ onNotFound });
      router.on('/', handler);
      mockLocation.pathname = '/';
      await boot(router);
      expect(onNotFound).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalled();
    });
  });

  /** -------------------- navigate() -------------------- **/

  describe('navigate()', () => {
    let router: Router;

    beforeEach(() => {
      router = createRouter({ mode: 'history' });
    });

    it('pushes a history entry by default', () => {
      router.navigate('/about');
      expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/about');
    });

    it('replaces the history entry when replace: true', () => {
      router.navigate('/about', { replace: true });
      expect(mockHistory.replaceState).toHaveBeenCalledWith(null, '', '/about');
    });

    it('passes custom state to history', () => {
      router.navigate('/about', { state: { from: '/' } });
      expect(mockHistory.pushState).toHaveBeenCalledWith({ from: '/' }, '', '/about');
    });

    it('returns a Promise', () => {
      expect(router.navigate('/about')).toBeInstanceOf(Promise);
    });

    it('resolves only after the route handler has run', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/done';
      router.on('/done', handler).start();
      await new Promise<void>((r) => setTimeout(r, 10));
      mockLocation.pathname = '/done';
      await router.navigate('/done');
      expect(handler).toHaveBeenCalled();
    });

    it('sets window.location.href for external (http) URLs', () => {
      router.navigate('https://example.com');
      expect(mockHistory.pushState).not.toHaveBeenCalled();
    });
  });

  /** -------------------- navigateTo() -------------------- **/

  describe('navigateTo()', () => {
    let router: Router;

    beforeEach(() => {
      router = createRouter();
    });

    it('navigates to a named route and substitutes params', () => {
      router.route({ handler: vi.fn(), name: 'userDetail', path: '/users/:id' });
      router.navigateTo('userDetail', { id: '123' });
      expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/users/123');
    });

    it('supports the replace option', () => {
      router.route({ handler: vi.fn(), name: 'home', path: '/' });
      router.navigateTo('home', undefined, { replace: true });
      expect(mockHistory.replaceState).toHaveBeenCalledWith(null, '', '/');
    });

    it('throws when the named route does not exist', () => {
      expect(() => router.navigateTo('nonExistent')).toThrow();
    });
  });

  /** -------------------- start() / stop() -------------------- **/

  describe('start() / stop()', () => {
    let router: Router;

    beforeEach(() => {
      router = createRouter();
    });

    it('start() returns the router instance for chaining', () => {
      expect(router.start()).toBe(router);
    });

    it('start() is idempotent - the initial handler runs exactly once', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/';
      router.on('/', handler);
      router.start();
      router.start();
      await new Promise<void>((r) => setTimeout(r, 10));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('stop() returns the router instance for chaining', () => {
      router.start();
      expect(router.stop()).toBe(router);
    });

    it('stop() is safe to call when the router is not started', () => {
      expect(() => router.stop()).not.toThrow();
    });
  });

  /** -------------------- subscribe() / getState() -------------------- **/

  describe('subscribe() / getState()', () => {
    let router: Router;

    beforeEach(() => {
      router = createRouter();
    });

    it('fires the listener immediately with the current state on subscription', async () => {
      const listener = vi.fn();
      mockLocation.pathname = '/users/42';
      router.on('/users/:id', vi.fn()).start();
      await new Promise<void>((r) => setTimeout(r, 10));
      router.subscribe(listener);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ params: { id: '42' }, pathname: '/users/42' }));
    });

    it('notifies listener on subsequent route changes', async () => {
      const listener = vi.fn();
      mockLocation.pathname = '/';
      router.on('/', vi.fn()).on('/about', vi.fn()).start();
      router.subscribe(listener);
      await new Promise<void>((r) => setTimeout(r, 10));
      listener.mockClear();
      mockLocation.pathname = '/about';
      await router.navigate('/about');
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/about' }));
    });

    it('includes route name in state for named routes', async () => {
      const listener = vi.fn();
      mockLocation.pathname = '/users/42';
      router.route({ handler: vi.fn(), name: 'userProfile', path: '/users/:id' }).start();
      router.subscribe(listener);
      await new Promise<void>((r) => setTimeout(r, 10));
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ name: 'userProfile' }));
    });

    it('unsubscribe() stops further notifications', async () => {
      const listener = vi.fn();
      router.on('/', vi.fn()).start();
      const unsubscribe = router.subscribe(listener);
      await new Promise<void>((r) => setTimeout(r, 10));
      const before = listener.mock.calls.length;
      unsubscribe();
      await router.navigate('/about');
      await new Promise<void>((r) => setTimeout(r, 10));
      expect(listener).toHaveBeenCalledTimes(before);
    });

    it('getState() returns pathname, params, query, and hash', async () => {
      mockLocation.pathname = '/users/123';
      mockLocation.search = '?tab=profile';
      router.route({ handler: vi.fn(), path: '/users/:id' }).start();
      await new Promise<void>((r) => setTimeout(r, 10));
      const state = router.getState();
      expect(state.pathname).toBe('/users/123');
      expect(state.params).toEqual({ id: '123' });
      expect(state.query).toEqual({ tab: 'profile' });
    });

    it('getState() includes route name for named routes', async () => {
      mockLocation.pathname = '/users/123';
      router.route({ handler: vi.fn(), name: 'userDetail', path: '/users/:id' }).start();
      await new Promise<void>((r) => setTimeout(r, 10));
      expect(router.getState().name).toBe('userDetail');
    });
  });

  /** -------------------- isActive() -------------------- **/

  describe('isActive()', () => {
    let router: Router;

    beforeEach(() => {
      router = createRouter();
    });

    it('returns true for a matching path pattern', async () => {
      mockLocation.pathname = '/users/123';
      await boot(router);
      expect(router.isActive('/users/:id')).toBe(true);
    });

    it('returns false for a non-matching path pattern', async () => {
      mockLocation.pathname = '/users/123';
      await boot(router);
      expect(router.isActive('/posts/:id')).toBe(false);
    });

    it('accepts a route name instead of a literal pattern', async () => {
      mockLocation.pathname = '/users/123';
      router.route({ handler: vi.fn(), name: 'userDetail', path: '/users/:id' });
      await boot(router);
      expect(router.isActive('userDetail')).toBe(true);
    });

    it('returns false for an inactive named route', async () => {
      mockLocation.pathname = '/about';
      router.route({ handler: vi.fn(), name: 'userDetail', path: '/users/:id' });
      await boot(router);
      expect(router.isActive('userDetail')).toBe(false);
    });
  });

  /** -------------------- url() -------------------- **/

  describe('url()', () => {
    let router: Router;

    beforeEach(() => {
      router = createRouter();
    });

    it('interpolates path parameters', () => {
      expect(router.url('/users/:id', { id: '123' })).toBe('/users/123');
    });

    it('appends query parameters as a search string', () => {
      const url = router.url('/search', undefined, { q: 'test' });
      expect(url).toContain('/search?');
      expect(url).toContain('q=test');
    });

    it('appends array query parameters with repeated keys', () => {
      expect(router.url('/search', undefined, { tags: ['a', 'b'] })).toBe('/search?tags=a&tags=b');
    });

    it('builds URL for a named route', () => {
      router.route({ handler: vi.fn(), name: 'user', path: '/users/:id' });
      expect(router.url('user', { id: '123' })).toBe('/users/123');
    });

    it('includes the base path prefix', () => {
      const r = createRouter({ base: '/app' });
      expect(r.url('/users')).toBe('/app/users');
    });

    it('throws for an unknown named route', () => {
      expect(() => router.url('nonExistent')).toThrow();
    });

    it('throws when a required path parameter is missing', () => {
      expect(() => router.url('/users/:id')).toThrow();
      expect(() => router.url('/posts/:userId/comments/:commentId', { userId: '1' })).toThrow();
    });

    it('does not throw when all required params are supplied', () => {
      expect(() => router.url('/users/:id', { id: '5' })).not.toThrow();
    });
  });
});

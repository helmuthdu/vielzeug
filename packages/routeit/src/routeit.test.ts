import type { RouteContext, Router } from './routeit';

import { createRouter } from './routeit';

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

  /** -------------------- Route registration -------------------- **/

  describe('Route registration', () => {
    it('on() fires the handler when the pathname matches', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/about';
      await boot(createRouter().on('/about', handler));
      expect(handler).toHaveBeenCalled();
    });

    it('on() with options registers name and meta; handler receives them in context', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/home';
      await boot(createRouter().on('/home', handler, { meta: { title: 'Home' }, name: 'home' }));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ meta: { title: 'Home' } }));
    });

    it('on(), group(), and use() are all chainable', () => {
      const router = createRouter();

      expect(
        router
          .on('/', vi.fn())
          .on('/a', vi.fn())
          .use(vi.fn())
          .group('/prefix', (r) => r.on('/page', vi.fn())),
      ).toBe(router);
    });

    it('on() with options registers a named route resolvable by name', () => {
      const router = createRouter();

      router.on('/posts/:id', vi.fn(), { name: 'postDetail' });
      expect(router.url('postDetail', { id: '99' })).toBe('/posts/99');
    });

    it('a second on() with the same name overwrites the earlier routesByName entry', () => {
      const router = createRouter();

      router.on('/old', vi.fn(), { name: 'page' });
      router.on('/new', vi.fn(), { name: 'page' });
      expect(router.url('page')).toBe('/new');
    });

    it('middleware-only route (no handler) still runs its middleware on path match', async () => {
      const mw = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => next());

      mockLocation.pathname = '/hook';
      await boot(createRouter().on('/hook', { middleware: mw }));
      expect(mw).toHaveBeenCalled();
    });

    it('group() applies a shared prefix to all routes in the callback', async () => {
      const handler = vi.fn();
      const router = createRouter();

      router.group('/admin', (r) => r.on('/dashboard', handler));
      mockLocation.pathname = '/admin/dashboard';
      await boot(router);
      expect(handler).toHaveBeenCalled();
    });

    it('group() does not match when visiting the unprefixed path', async () => {
      const handler = vi.fn();
      const router = createRouter();

      router.group('/admin', (r) => r.on('/dashboard', handler));
      mockLocation.pathname = '/dashboard';
      await boot(router);
      expect(handler).not.toHaveBeenCalled();
    });

    it('group() applies middleware to every route in the group', async () => {
      const calls: string[] = [];
      const auth = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
        calls.push('auth');
        await next();
      });
      const router = createRouter();

      router.group('/admin', (r) => r.on('/users', () => calls.push('users')), { middleware: [auth] });
      mockLocation.pathname = '/admin/users';
      await boot(router);
      expect(calls).toEqual(['auth', 'users']);
    });

    it('group() middleware runs before route-level middleware', async () => {
      const order: string[] = [];
      const groupMw = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
        order.push('group');
        await next();
      });
      const routeMw = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
        order.push('route');
        await next();
      });

      mockLocation.pathname = '/g/page';
      await boot(
        createRouter().group('/g', (r) => r.on('/page', () => order.push('handler'), { middleware: [routeMw] }), {
          middleware: [groupMw],
        }),
      );
      expect(order).toEqual(['group', 'route', 'handler']);
    });

    it('group() supports nesting and stacks prefixes correctly', async () => {
      const calls: string[] = [];
      const auth = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
        calls.push('auth');
        await next();
      });
      const router = createRouter();

      router.group(
        '/admin',
        (r) => {
          r.group('/users', (inner) => {
            inner.on('/:id', () => calls.push('handler'));
          });
        },
        { middleware: auth },
      );
      mockLocation.pathname = '/admin/users/1';
      await boot(router);
      expect(calls).toEqual(['auth', 'handler']);
    });

    it('named routes inside group() resolve against the full prefixed path', () => {
      const router = createRouter();

      router.group('/users', (r) => {
        r.on('/:id', vi.fn(), { name: 'userDetail' });
      });
      expect(router.url('userDetail', { id: '99' })).toBe('/users/99');
    });
  });

  /** -------------------- Path matching -------------------- **/

  describe('Path matching', () => {
    it('matches root path /', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/';
      await boot(createRouter().on('/', handler));
      expect(handler).toHaveBeenCalled();
    });

    it('matches a static path exactly', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/about';
      await boot(createRouter().on('/about', handler));
      expect(handler).toHaveBeenCalled();
    });

    it('matches a single :param and injects it into ctx.params', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/users/123';
      await boot(createRouter().on('/users/:id', handler));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { id: '123' } }));
    });

    it('matches multiple :params in a single pattern', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/users/123/posts/456';
      await boot(createRouter().on('/users/:userId/posts/:postId', handler));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { postId: '456', userId: '123' } }));
    });

    it('URL-decodes percent-encoded path parameters', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/search/hello%20world';
      await boot(createRouter().on('/search/:query', handler));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { query: 'hello world' } }));
    });

    it('wildcard /docs/* matches any sub-path', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/docs/guide/intro';
      await boot(createRouter().on('/docs/*', handler));
      expect(handler).toHaveBeenCalled();
    });

    it('bare * matches any path globally', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/deep/nested/path';
      await boot(createRouter().on('*', handler));
      expect(handler).toHaveBeenCalled();
    });

    it('named wildcard :param* captures a multi-segment path as a named param', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/docs/guide/intro';
      await boot(createRouter().on('/docs/:rest*', handler));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { rest: 'guide/intro' } }));
    });

    it('named wildcard :param* captures a single segment', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/docs/intro';
      await boot(createRouter().on('/docs/:rest*', handler));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { rest: 'intro' } }));
    });

    it('named wildcard :param* with trailing slash matches (capturing empty string)', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/docs/';
      await boot(createRouter().on('/docs/:rest*', handler));
      expect(handler).toHaveBeenCalled();
    });

    it('bare /static/* matches without exposing a named param', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/static/image.png';
      await boot(createRouter().on('/static/*', handler));
      expect(handler).toHaveBeenCalled();
    });

    it('first registered route wins on ambiguous pattern match', async () => {
      const first = vi.fn();
      const second = vi.fn();

      mockLocation.pathname = '/items/42';
      await boot(createRouter().on('/items/:id', first).on('/items/:slug', second));
      expect(first).toHaveBeenCalled();
      expect(second).not.toHaveBeenCalled();
    });

    it('no handler fires when no route matches', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/missing';
      await boot(createRouter().on('/other', handler));
      expect(handler).not.toHaveBeenCalled();
    });

    it('treats an empty pathname as root /', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '';
      await boot(createRouter().on('/', handler));
      expect(handler).toHaveBeenCalled();
    });
  });

  /** -------------------- Query parameters -------------------- **/

  describe('Query parameters', () => {
    it('parses a single query param into ctx.query', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/search';
      mockLocation.search = '?q=hello';
      await boot(createRouter().on('/search', handler));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: { q: 'hello' } }));
    });

    it('parses multiple distinct query params', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/search';
      mockLocation.search = '?q=test&page=2&limit=10';
      await boot(createRouter().on('/search', handler));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: { limit: '10', page: '2', q: 'test' } }));
    });

    it('repeated keys produce a string array in ctx.query', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/search';
      mockLocation.search = '?tags=a&tags=b&tags=c';
      await boot(createRouter().on('/search', handler));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: { tags: ['a', 'b', 'c'] } }));
    });

    it('an empty search string yields an empty ctx.query object', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/plain';
      mockLocation.search = '';
      await boot(createRouter().on('/plain', handler));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: {} }));
    });

    it('a query param key with no value is an empty string', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/page';
      mockLocation.search = '?debug=&page=2';
      await boot(createRouter().on('/page', handler));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: { debug: '', page: '2' } }));
    });
  });

  /** -------------------- Route context -------------------- **/

  describe('Route context', () => {
    it('ctx exposes params, query, pathname, hash, locals, and navigate', async () => {
      let ctx: RouteContext | undefined;

      mockLocation.pathname = '/users/7';
      mockLocation.search = '?tab=info';
      mockLocation.hash = '#section';
      await boot(
        createRouter().on('/users/:id', (c) => {
          ctx = c;
        }),
      );
      expect(ctx?.params).toEqual({ id: '7' });
      expect(ctx?.query).toEqual({ tab: 'info' });
      expect(ctx?.pathname).toBe('/users/7');
      expect(ctx?.hash).toBe('section');
      expect(ctx?.locals).toEqual({});
      expect(ctx?.navigate).toBeTypeOf('function');
    });

    it('ctx.meta is populated from the route definition', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/guarded';
      await boot(createRouter().on('/guarded', handler, { meta: { requiresAuth: true } }));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ meta: { requiresAuth: true } }));
    });

    it('locals mutated by middleware are visible in the subsequent handler', async () => {
      let capturedLocals: Record<string, unknown> | undefined;

      mockLocation.pathname = '/page';

      const mw = vi.fn(async (ctx: RouteContext, next: () => Promise<void>) => {
        ctx.locals.user = 'alice';
        await next();
      });

      await boot(
        createRouter().on(
          '/page',
          (ctx) => {
            capturedLocals = ctx.locals;
          },
          { middleware: [mw] },
        ),
      );
      expect(capturedLocals).toEqual({ user: 'alice' });
    });

    it('ctx.navigate() from inside a handler triggers a programmatic navigation', async () => {
      const target = vi.fn();
      const router = createRouter();

      router.on('/', async (ctx) => {
        await ctx.navigate('/target');
      });
      router.on('/target', target);
      mockLocation.pathname = '/';
      await boot(router);
      expect(target).toHaveBeenCalled();
    });

    it('ctx.navigate() in middleware can redirect and block the original handler', async () => {
      const blocked = vi.fn();
      const login = vi.fn();
      const router = createRouter();

      router.on('/protected', blocked, {
        middleware: async (ctx) => {
          await ctx.navigate('/login');
        },
      });
      router.on('/login', login);
      mockLocation.pathname = '/protected';
      await boot(router);
      expect(blocked).not.toHaveBeenCalled();
      expect(login).toHaveBeenCalled();
    });
  });

  /** -------------------- Middleware chain -------------------- **/

  describe('Middleware chain', () => {
    it('a single middleware runs before the handler', async () => {
      const calls: string[] = [];
      const router = createRouter();

      router.on(
        '/test',
        () => {
          calls.push('handler');
        },
        {
          middleware: async (_ctx, next) => {
            calls.push('mw');
            await next();
          },
        },
      );
      mockLocation.pathname = '/test';
      await boot(router);
      expect(calls).toEqual(['mw', 'handler']);
    });

    it('array middleware runs in declaration order', async () => {
      const calls: string[] = [];
      const router = createRouter();

      router.on(
        '/test',
        () => {
          calls.push('handler');
        },
        {
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
        },
      );
      mockLocation.pathname = '/test';
      await boot(router);
      expect(calls).toEqual(['m1', 'm2', 'handler']);
    });

    it('middleware that omits next() blocks the handler', async () => {
      const handler = vi.fn();
      const router = createRouter();

      router.on('/test', handler, {
        middleware: async () => {
          /* intentionally blocked */
        },
      });
      mockLocation.pathname = '/test';
      await boot(router);
      expect(handler).not.toHaveBeenCalled();
    });

    it('async middleware is awaited before calling the handler', async () => {
      const calls: string[] = [];
      const router = createRouter();

      router.on(
        '/test',
        () => {
          calls.push('handler');
        },
        {
          middleware: async (_ctx, next) => {
            calls.push('before');
            await new Promise<void>((r) => setTimeout(r, 5));
            calls.push('after');
            await next();
          },
        },
      );
      mockLocation.pathname = '/test';
      router.start();
      await new Promise<void>((r) => setTimeout(r, 20));
      expect(calls).toEqual(['before', 'after', 'handler']);
    });

    it('locals mutated by middleware are available to downstream middleware', async () => {
      let locals: unknown;
      const router = createRouter();

      router.on(
        '/test',
        (ctx) => {
          locals = ctx.locals;
        },
        {
          middleware: async (ctx, next) => {
            ctx.locals = { user: { id: '1' } };
            await next();
          },
        },
      );
      mockLocation.pathname = '/test';
      await boot(router);
      expect(locals).toEqual({ user: { id: '1' } });
    });

    it('global middleware (RouterOptions.middleware) runs before route-level middleware', async () => {
      const calls: string[] = [];
      const router = createRouter({
        middleware: async (_ctx, next) => {
          calls.push('global');
          await next();
        },
      });

      router.on(
        '/test',
        () => {
          calls.push('handler');
        },
        {
          middleware: async (_ctx, next) => {
            calls.push('route');
            await next();
          },
        },
      );
      mockLocation.pathname = '/test';
      await boot(router);
      expect(calls).toEqual(['global', 'route', 'handler']);
    });

    it('global middleware runs before every route handler', async () => {
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

    it('multiple global middleware run in declaration order', async () => {
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

    it('use() adds global middleware after construction', async () => {
      const calls: string[] = [];
      const router = createRouter();

      router.use(async (_ctx, next) => {
        calls.push('late');
        await next();
      });
      router.on('/', () => calls.push('handler'));
      mockLocation.pathname = '/';
      await boot(router);
      expect(calls).toEqual(['late', 'handler']);
    });

    it('use() accepts multiple middleware at once, all run in order', async () => {
      const calls: string[] = [];
      const router = createRouter();

      router.use(
        async (_ctx, next) => {
          calls.push('a');
          await next();
        },
        async (_ctx, next) => {
          calls.push('b');
          await next();
        },
      );
      router.on('/', () => calls.push('handler'));
      mockLocation.pathname = '/';
      await boot(router);
      expect(calls).toEqual(['a', 'b', 'handler']);
    });

    it('use() middleware runs after middleware registered at construction', async () => {
      const calls: string[] = [];
      const router = createRouter({
        middleware: async (_ctx, next) => {
          calls.push('early');
          await next();
        },
      });

      router.use(async (_ctx, next) => {
        calls.push('late');
        await next();
      });
      router.on('/', () => calls.push('handler'));
      mockLocation.pathname = '/';
      await boot(router);
      expect(calls).toEqual(['early', 'late', 'handler']);
    });

    it('middleware can redirect by calling ctx.navigate() without calling next()', async () => {
      const protectedHandler = vi.fn();
      const router = createRouter();

      router.on('/protected', protectedHandler, {
        middleware: async () => {
          router.navigate('/login');
        },
      });
      router.on('/login', vi.fn());
      mockLocation.pathname = '/protected';
      await boot(router);
      expect(protectedHandler).not.toHaveBeenCalled();
      expect(mockHistory.pushState).toHaveBeenCalled();
    });
  });

  /** -------------------- Error handling -------------------- **/

  describe('Error handling', () => {
    it('logs to console.error when no onError hook is configured', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const router = createRouter();

      router.on('/test', vi.fn(), {
        middleware: async () => {
          throw new Error('boom');
        },
      });
      mockLocation.pathname = '/test';
      await boot(router);
      expect(consoleSpy).toHaveBeenCalledWith('[routeit] Route handling error:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('calls onError with the thrown error and route context', async () => {
      const onError = vi.fn();
      const router = createRouter({ onError });

      router.on('/test', vi.fn(), {
        middleware: async () => {
          throw new Error('boom');
        },
      });
      mockLocation.pathname = '/test';
      await boot(router);
      expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ pathname: '/test' }));
    });

    it('onError context includes route meta', async () => {
      const onError = vi.fn();
      const router = createRouter({ onError });

      router.on(
        '/settings',
        async () => {
          throw new Error('oops');
        },
        { meta: { secured: true } },
      );
      mockLocation.pathname = '/settings';
      await boot(router);
      expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ meta: { secured: true } }));
    });

    it('onNotFound is called with context when no route matches', async () => {
      const onNotFound = vi.fn();
      const router = createRouter({ onNotFound });

      router.on('/', vi.fn());
      mockLocation.pathname = '/does-not-exist';
      await boot(router);
      expect(onNotFound).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/does-not-exist' }));
    });

    it('onNotFound is NOT called when a route matches', async () => {
      const onNotFound = vi.fn();
      const handler = vi.fn();
      const router = createRouter({ onNotFound });

      router.on('/', handler);
      mockLocation.pathname = '/';
      await boot(router);
      expect(onNotFound).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalled();
    });

    it('a throwing listener is caught, logged, and does not prevent other listeners from running', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const good = vi.fn();

      mockLocation.pathname = '/about';

      const router = createRouter().on('/about', vi.fn());

      router.subscribe(() => {
        throw new Error('bad listener');
      });
      router.subscribe(good);
      good.mockClear();
      await router.navigate('/about', { force: true });
      expect(consoleSpy).toHaveBeenCalledWith('[routeit] Listener error:', expect.any(Error));
      expect(good).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  /** -------------------- redirect pattern -------------------- **/

  describe('redirect pattern (on() + ctx.navigate)', () => {
    it('navigates to the target path when the from-path is visited', async () => {
      const handler = vi.fn();
      const router = createRouter();

      router.on('/old', (ctx) => ctx.navigate('/new', { replace: true }));
      router.on('/new', handler);
      mockLocation.pathname = '/old';
      await boot(router);
      expect(handler).toHaveBeenCalled();
    });

    it('uses replaceState when { replace: true } is passed', async () => {
      const router = createRouter();

      router.on('/old', (ctx) => ctx.navigate('/new', { replace: true }));
      router.on('/new', vi.fn());
      mockLocation.pathname = '/old';
      await boot(router);
      expect(mockHistory.replaceState).toHaveBeenCalledWith(null, '', '/new');
      expect(mockHistory.pushState).not.toHaveBeenCalled();
    });

    it('accepts a named route as the navigation destination', async () => {
      const handler = vi.fn();
      const router = createRouter();

      router.on('/new', handler, { name: 'newPage' });
      router.on('/old', (ctx) => ctx.navigate({ name: 'newPage' }, { replace: true }));
      mockLocation.pathname = '/old';
      await boot(router);
      expect(handler).toHaveBeenCalled();
    });

    it('forwards additional state via navigate options', async () => {
      const router = createRouter();

      router.on('/old', (ctx) => ctx.navigate('/new', { replace: true, state: 'extra' }));
      router.on('/new', vi.fn());
      mockLocation.pathname = '/old';
      await boot(router);
      expect(mockHistory.replaceState).toHaveBeenCalledWith('extra', '', '/new');
      expect(mockHistory.pushState).not.toHaveBeenCalled();
    });
  });

  /** -------------------- Navigation -------------------- **/

  describe('Navigation', () => {
    describe('history mode', () => {
      it('calls pushState with the target path', () => {
        createRouter({ mode: 'history' }).navigate('/about');
        expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/about');
      });

      it('{ replace: true } calls replaceState instead of pushState', () => {
        createRouter({ mode: 'history' }).navigate('/about', { replace: true });
        expect(mockHistory.replaceState).toHaveBeenCalledWith(null, '', '/about');
        expect(mockHistory.pushState).not.toHaveBeenCalled();
      });

      it('{ state } option is forwarded to pushState', () => {
        createRouter({ mode: 'history' }).navigate('/about', { state: { from: '/' } });
        expect(mockHistory.pushState).toHaveBeenCalledWith({ from: '/' }, '', '/about');
      });

      it('returns a Promise that resolves after the handler has run', async () => {
        // eslint-disable-next-line no-useless-assignment
        let settled = false;
        const router = createRouter().on('/page', () => {
          settled = true;
        });

        await boot(router);
        settled = false;
        await router.navigate('/page', { force: true });
        expect(settled).toBe(true);
      });

      it('strips the base prefix when matching routes', async () => {
        const handler = vi.fn();

        mockLocation.pathname = '/app/about';
        await boot(createRouter({ base: '/app' }).on('/about', handler));
        expect(handler).toHaveBeenCalled();
      });
    });

    describe('with base path', () => {
      it('prepends base to outgoing navigation', () => {
        createRouter({ base: '/app', mode: 'history' }).navigate('/users');
        expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/app/users');
      });

      it('normalises trailing slash in base', () => {
        createRouter({ base: '/app/', mode: 'history' }).navigate('/users');
        expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/app/users');
      });

      it('does not double-prepend base when navigating to a named route', () => {
        const router = createRouter({ base: '/app', mode: 'history' });

        router.on('/users', vi.fn(), { name: 'users' });
        router.navigate({ name: 'users' });
        expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/app/users');
      });

      it('does not double-prepend base for named routes with params', () => {
        const router = createRouter({ base: '/app', mode: 'history' });

        router.on('/users/:id', vi.fn(), { name: 'user' });
        router.navigate({ name: 'user', params: { id: '42' } });
        expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/app/users/42');
      });
    });

    describe('with named target', () => {
      let router: Router;

      beforeEach(() => {
        router = createRouter();
      });

      it('substitutes path params in the named route URL', () => {
        router.on('/users/:id', vi.fn(), { name: 'userDetail' });
        router.navigate({ name: 'userDetail', params: { id: '123' } });
        expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/users/123');
      });

      it('{ replace: true } uses replaceState', () => {
        router.on('/', vi.fn(), { name: 'home' });
        router.navigate({ name: 'home' }, { replace: true });
        expect(mockHistory.replaceState).toHaveBeenCalledWith(null, '', '/');
      });

      it('query params are appended to the generated URL', () => {
        router.on('/search', vi.fn(), { name: 'search' });
        router.navigate({ name: 'search', query: { q: 'hello' } });
        expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/search?q=hello');
      });

      it('throws for an unknown route name', async () => {
        await expect(router.navigate({ name: 'nonExistent' })).rejects.toThrow();
      });
    });

    describe('with hash fragment', () => {
      let router: Router;

      beforeEach(() => {
        router = createRouter();
      });

      it('appends hash fragment from a named target', () => {
        router.on('/about', vi.fn(), { name: 'about' });
        router.navigate({ hash: '#section', name: 'about' });
        expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/about#section');
      });

      it('normalises a hash string that lacks a leading #', () => {
        router.on('/about', vi.fn(), { name: 'about' });
        router.navigate({ hash: 'intro', name: 'about' });
        expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/about#intro');
      });

      it('combines path params and hash fragment', () => {
        router.on('/users/:id', vi.fn(), { name: 'user' });
        router.navigate({ hash: '#profile', name: 'user', params: { id: '42' } });
        expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/users/42#profile');
      });

      it('same path but different hash is treated as a new navigation', async () => {
        router.on('/about', vi.fn(), { name: 'about' });
        mockLocation.pathname = '/about';
        await boot(router);
        mockHistory.pushState.mockClear();
        router.navigate({ hash: '#section', name: 'about' });
        expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/about#section');
      });
    });

    describe('same-URL deduplication', () => {
      it('does not push a new history entry when navigating to the current URL', async () => {
        const handler = vi.fn();
        const router = createRouter({ mode: 'history' });

        router.on('/about', handler);
        mockLocation.pathname = '/about';
        await boot(router);
        handler.mockClear();
        mockHistory.pushState.mockClear();
        await router.navigate('/about');
        expect(mockHistory.pushState).not.toHaveBeenCalled();
        expect(handler).not.toHaveBeenCalled();
      });

      it('does not re-run for the same path with identical query string', async () => {
        const router = createRouter({ mode: 'history' });

        mockLocation.pathname = '/search';
        mockLocation.search = '?q=test';

        const handler = vi.fn();

        router.on('/search', handler);
        await boot(router);
        handler.mockClear();
        mockHistory.pushState.mockClear();
        await router.navigate('/search?q=test');
        expect(mockHistory.pushState).not.toHaveBeenCalled();
      });

      it('{ force: true } bypasses the deduplication check', async () => {
        const handler = vi.fn();
        const router = createRouter({ mode: 'history' });

        router.on('/about', handler);
        mockLocation.pathname = '/about';
        await boot(router);
        handler.mockClear();
        await router.navigate('/about', { force: true });
        expect(handler).toHaveBeenCalled();
      });

      it('popstate resets the dedup state so the same URL can be navigated again', async () => {
        const handler = vi.fn();
        const router = createRouter({ mode: 'history' });

        router.on('/about', handler);
        mockLocation.pathname = '/about';
        await boot(router);
        // Simulate browser back
        mockLocation.pathname = '/';
        window.dispatchEvent(new Event('popstate'));
        await new Promise<void>((r) => setTimeout(r, 10));
        handler.mockClear();
        mockHistory.pushState.mockClear();
        await router.navigate('/about');
        expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/about');
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });

    describe('hash mode', () => {
      it('reads current path from location.hash to match routes', async () => {
        const handler = vi.fn();

        mockLocation.hash = '#/about';
        await boot(createRouter({ mode: 'hash' }).on('/about', handler));
        expect(handler).toHaveBeenCalled();
      });

      it('navigate() sets location.hash instead of calling pushState', () => {
        createRouter({ mode: 'hash' }).navigate('/about');
        expect(mockLocation.hash).toBe('/about');
        expect(mockHistory.pushState).not.toHaveBeenCalled();
      });

      it('hash mode ignores base when navigating (routes use hash fragment, not pathname)', () => {
        const router = createRouter({ base: '/app', mode: 'hash' });

        router.navigate('/about');
        expect(mockLocation.hash).toBe('/about');
      });
    });
  });

  /** -------------------- Lifecycle — start / stop / autoStart -------------------- **/

  describe('Lifecycle', () => {
    it('start() triggers the initial route match', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/';
      await boot(createRouter().on('/', handler));
      expect(handler).toHaveBeenCalled();
    });

    it('start() is idempotent — handler runs exactly once even when called twice', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/';

      const router = createRouter().on('/', handler);

      router.start();
      router.start();
      await new Promise<void>((r) => setTimeout(r, 10));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('stop() prevents popstate from triggering further route matching', async () => {
      const handler = vi.fn();
      const router = createRouter().on('/about', handler);

      await boot(router);
      router.stop();
      mockLocation.pathname = '/about';
      window.dispatchEvent(new Event('popstate'));
      await new Promise<void>((r) => setTimeout(r, 10));
      expect(handler).not.toHaveBeenCalled();
    });

    it('stop() is safe to call when the router was never started', () => {
      expect(() => createRouter().stop()).not.toThrow();
    });

    it('autoStart: true starts the router without an explicit start() call', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/home';
      createRouter({ autoStart: true }).on('/home', handler);
      await new Promise<void>((r) => setTimeout(r, 10));
      expect(handler).toHaveBeenCalled();
    });

    it('autoStart: true — routes registered after createRouter() are all available', async () => {
      const a = vi.fn();
      const b = vi.fn();

      mockLocation.pathname = '/b';
      createRouter({ autoStart: true }).on('/a', a).on('/b', b);
      await new Promise<void>((r) => setTimeout(r, 10));
      expect(b).toHaveBeenCalled();
      expect(a).not.toHaveBeenCalled();
    });

    it('autoStart + explicit start() still runs handler only once', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/';

      const router = createRouter({ autoStart: true }).on('/', handler);

      await new Promise<void>((r) => setTimeout(r, 10));
      router.start();
      await new Promise<void>((r) => setTimeout(r, 10));
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  /** -------------------- State & subscribers -------------------- **/

  describe('State & subscribers', () => {
    it('state reflects the current pathname, params and query', async () => {
      mockLocation.pathname = '/users/123';
      mockLocation.search = '?tab=profile';

      const router = createRouter().on('/users/:id', vi.fn());

      await boot(router);
      expect(router.state).toMatchObject({
        params: { id: '123' },
        pathname: '/users/123',
        query: { tab: 'profile' },
      });
    });

    it('state.name is set for named routes', async () => {
      mockLocation.pathname = '/users/123';

      const router = createRouter().on('/users/:id', vi.fn(), { name: 'userDetail' });

      await boot(router);
      expect(router.state.name).toBe('userDetail');
    });

    it('state.meta reflects the matched route meta', async () => {
      const router = createRouter().on('/', vi.fn(), { meta: { layout: 'default', title: 'Home' } });

      mockLocation.pathname = '/';
      await boot(router);
      expect(router.state.meta).toEqual({ layout: 'default', title: 'Home' });
    });

    it('state.meta is undefined when no route matches', async () => {
      const router = createRouter({ onNotFound: vi.fn() });

      mockLocation.pathname = '/nowhere';
      await boot(router);
      expect(router.state.meta).toBeUndefined();
    });

    it('subscribe() fires immediately with the current state', async () => {
      const listener = vi.fn();

      mockLocation.pathname = '/users/42';

      const router = createRouter().on('/users/:id', vi.fn());

      await boot(router);
      router.subscribe(listener);
      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ params: { id: '42' }, pathname: '/users/42' }));
    });

    it('subscribe() notifies listener on subsequent navigations', async () => {
      const listener = vi.fn();

      mockLocation.pathname = '/';

      const router = createRouter().on('/', vi.fn()).on('/about', vi.fn());

      await boot(router);
      router.subscribe(listener);
      listener.mockClear();
      await router.navigate('/about');
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/about' }));
    });

    it('subscribe() listener receives route name in state notification', async () => {
      const listener = vi.fn();

      mockLocation.pathname = '/users/42';

      const router = createRouter().on('/users/:id', vi.fn(), { name: 'userProfile' });

      await boot(router);
      router.subscribe(listener);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ name: 'userProfile' }));
    });

    it('subscribe() listener receives meta in state notification', async () => {
      const listener = vi.fn();
      const router = createRouter().on('/about', vi.fn(), { meta: { title: 'About' } });

      mockLocation.pathname = '/about';
      await boot(router);
      router.subscribe(listener);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ meta: { title: 'About' } }));
    });

    it('unsubscribe() stops further listener notifications', async () => {
      const listener = vi.fn();
      const router = createRouter().on('/', vi.fn());

      await boot(router);

      const unsubscribe = router.subscribe(listener);
      const before = listener.mock.calls.length;

      unsubscribe();
      await router.navigate('/about');
      await new Promise<void>((r) => setTimeout(r, 10));
      expect(listener).toHaveBeenCalledTimes(before);
    });
  });

  /** -------------------- isActive() -------------------- **/

  describe('isActive()', () => {
    let router: Router;

    beforeEach(() => {
      router = createRouter();
    });

    it('returns true when the pattern matches the current path', async () => {
      mockLocation.pathname = '/users/123';
      await boot(router);
      expect(router.isActive('/users/:id')).toBe(true);
    });

    it('returns false when the pattern does not match', async () => {
      mockLocation.pathname = '/users/123';
      await boot(router);
      expect(router.isActive('/posts/:id')).toBe(false);
    });

    it('accepts a route name instead of a pattern', async () => {
      mockLocation.pathname = '/users/123';
      router.on('/users/:id', vi.fn(), { name: 'userDetail' });
      await boot(router);
      expect(router.isActive('userDetail')).toBe(true);
    });

    it('returns false for an inactive named route', async () => {
      mockLocation.pathname = '/about';
      router.on('/users/:id', vi.fn(), { name: 'userDetail' });
      await boot(router);
      expect(router.isActive('userDetail')).toBe(false);
    });

    it('prefix matching matches when the current path starts with the pattern', async () => {
      mockLocation.pathname = '/admin/users/42';
      await boot(router);
      expect(router.isActive('/admin', false)).toBe(true);
      expect(router.isActive('/admin/users', false)).toBe(true);
    });

    it('prefix matching with a named route matches child paths', async () => {
      mockLocation.pathname = '/admin/settings';
      router.on('/admin', vi.fn(), { name: 'admin' });
      await boot(router);
      expect(router.isActive('admin', false)).toBe(true);
    });

    it('prefix matching does NOT match a sibling path sharing only a text prefix', async () => {
      mockLocation.pathname = '/adminfoo';
      await boot(router);
      expect(router.isActive('/admin', false)).toBe(false);
    });

    it('default (exact: true) does not match a parent/prefix path', async () => {
      mockLocation.pathname = '/admin/users';
      await boot(router);
      expect(router.isActive('/admin')).toBe(false);
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
      router.on('/users/:id', vi.fn(), { name: 'user' });
      expect(router.url('user', { id: '123' })).toBe('/users/123');
    });

    it('includes the base path prefix in history mode', () => {
      const r = createRouter({ base: '/app' });

      expect(r.url('/users')).toBe('/app/users');
    });

    it('does not include base in hash mode', () => {
      const r = createRouter({ base: '/app', mode: 'hash' });

      expect(r.url('/users')).toBe('/users');
    });

    it('throws for an unknown named route', () => {
      expect(() => router.url('nonExistent')).toThrow();
    });

    it('throws when a required path parameter is missing', () => {
      expect(() => router.url('/users/:id')).toThrow();
      expect(() => router.url('/posts/:userId/comments/:commentId', { userId: '1' })).toThrow();
    });

    it('builds a wildcard param URL without encoding slashes', () => {
      router.on('/docs/:rest*', vi.fn(), { name: 'docs' });
      expect(router.url('docs', { rest: 'guide/intro' })).toBe('/docs/guide/intro');
      expect(router.url('/docs/:rest*', { rest: 'a/b/c' })).toBe('/docs/a/b/c');
    });
  });

  /** -------------------- resolve() -------------------- **/

  describe('resolve()', () => {
    let router: Router;

    beforeEach(() => {
      router = createRouter();
    });

    it('returns name, params, and meta for a matching path', () => {
      router.on('/users/:id', vi.fn(), { meta: { title: 'User' }, name: 'userDetail' });
      expect(router.resolve('/users/42')).toEqual({
        meta: { title: 'User' },
        name: 'userDetail',
        params: { id: '42' },
      });
    });

    it('returns null when no route matches', () => {
      router.on('/home', vi.fn());
      expect(router.resolve('/unknown')).toBeNull();
    });

    it('name and meta are undefined for routes registered without them', () => {
      router.on('/bare', vi.fn());
      expect(router.resolve('/bare')).toEqual({ meta: undefined, name: undefined, params: {} });
    });

    it('first registered route wins when multiple patterns match', () => {
      router.on('/items/:id', vi.fn(), { name: 'first' });
      router.on('/items/:slug', vi.fn(), { name: 'second' });
      expect(router.resolve('/items/42')?.name).toBe('first');
    });

    it('strips the base path in history mode so callers can pass window.location.pathname', () => {
      const baseRouter = createRouter({ base: '/app' });

      baseRouter.on('/users', vi.fn(), { name: 'users' });
      expect(baseRouter.resolve('/app/users')).toEqual({ meta: undefined, name: 'users', params: {} });
    });

    it('does not trigger navigation or notify listeners', () => {
      const listener = vi.fn();

      router.on('/about', vi.fn()).start();
      router.subscribe(listener);
      listener.mockClear();
      router.resolve('/about');
      expect(listener).not.toHaveBeenCalled();
      expect(mockHistory.pushState).not.toHaveBeenCalled();
    });
  });
});

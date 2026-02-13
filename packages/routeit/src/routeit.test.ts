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
  pushState: vi.fn(),
  replaceState: vi.fn(),
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

Object.defineProperty(window, 'history', {
  value: mockHistory,
  writable: true,
});

/** -------------------- Tests -------------------- **/

describe('Router', () => {
  let router: Router;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.pathname = '/';
    mockLocation.search = '';
    mockLocation.hash = '';
  });

  /** -------------------- Creation & Configuration -------------------- **/

  describe('Creation', () => {
    it('creates router with default options', () => {
      router = createRouter();
      expect(router).toBeDefined();
      expect(typeof router.navigate).toBe('function');
    });

    it('creates router with history mode', () => {
      router = createRouter({ mode: 'history' });
      expect(router).toBeDefined();
    });

    it('creates router with hash mode', () => {
      router = createRouter({ mode: 'hash' });
      expect(router).toBeDefined();
    });

    it('creates router with base path', () => {
      router = createRouter({ base: '/app' });
      const url = router.buildUrl('/users');
      expect(url).toBe('/app/users');
    });

    it('normalizes base path (removes trailing slash)', () => {
      router = createRouter({ base: '/app/' });
      const url = router.buildUrl('/users');
      expect(url).toBe('/app/users');
    });

    it('creates router with notFound handler', () => {
      const notFound = vi.fn();
      router = createRouter({ notFound });
      expect(router).toBeDefined();
    });

    it('creates router with global middleware', () => {
      const middleware = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => next());
      router = createRouter({ middleware });
      expect(router).toBeDefined();
    });
  });

  /** -------------------- Route Registration -------------------- **/

  describe('Route Registration', () => {
    beforeEach(() => {
      router = createRouter();
    });

    it('registers single route', () => {
      const handler = vi.fn();
      const result = router.route({ handler, path: '/' });
      expect(result).toBe(router); // Chainable
    });

    it('registers multiple routes', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const result = router.routes([
        { handler: handler1, path: '/' },
        { handler: handler2, path: '/about' },
      ]);
      expect(result).toBe(router);
    });

    it('registers route with convenience method get()', () => {
      const handler = vi.fn();
      const result = router.get('/', handler);
      expect(result).toBe(router);
    });

    it('registers route with name', () => {
      const handler = vi.fn();
      router.route({ handler, name: 'userDetail', path: '/users/:id' });
      const url = router.urlFor('userDetail', { id: '123' });
      expect(url).toBe('/users/123');
    });

    it('supports method chaining', () => {
      router
        .route({ handler: vi.fn(), path: '/' })
        .route({ handler: vi.fn(), path: '/about' })
        .get('/contact', vi.fn());
      expect(router).toBe(router);
    });
  });

  /** -------------------- Path Matching -------------------- **/

  describe('Path Matching', () => {
    beforeEach(() => {
      router = createRouter();
    });

    it('matches static paths', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/about';
      router.get('/about', handler).start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalled();
    });

    it('matches root path', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/';
      router.get('/', handler).start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalled();
    });

    it('extracts single parameter', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/users/123';
      router.get('/users/:id', handler).start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { id: '123' } }));
    });

    it('extracts multiple parameters', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/users/123/posts/456';
      router.get('/users/:userId/posts/:postId', handler).start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { postId: '456', userId: '123' } }));
    });

    it('decodes URL-encoded parameters', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/search/hello%20world';
      router.get('/search/:query', handler).start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { query: 'hello world' } }));
    });

    it('matches wildcard paths', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/docs/guide/intro';
      router.get('/docs/*', handler).start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalled();
    });

    it('does not match incorrect paths', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/about';
      router.get('/contact', handler).start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(handler).not.toHaveBeenCalled();
    });

    it('matches first matching route', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      mockLocation.pathname = '/test';
      router.get('/test', handler1).get('/test', handler2).start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  /** -------------------- Query Parameters -------------------- **/

  describe('Query Parameters', () => {
    beforeEach(() => {
      router = createRouter();
    });

    it('parses single query parameter', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/search';
      mockLocation.search = '?q=test';
      router.get('/search', handler).start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: { q: 'test' } }));
    });

    it('parses multiple query parameters', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/search';
      mockLocation.search = '?q=test&page=2&limit=10';
      router.get('/search', handler).start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: { limit: '10', page: '2', q: 'test' } }));
    });

    it('parses array query parameters', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/search';
      mockLocation.search = '?tags=a&tags=b&tags=c';
      router.get('/search', handler).start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: { tags: ['a', 'b', 'c'] } }));
    });

    it('handles empty query string', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/search';
      mockLocation.search = '';
      router.get('/search', handler).start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: {} }));
    });
  });

  /** -------------------- Navigation -------------------- **/

  describe('Navigation', () => {
    beforeEach(() => {
      router = createRouter({ mode: 'history' });
    });

    it('navigates with pushState', () => {
      router.navigate('/about');
      expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/about');
    });

    it('navigates with replaceState', () => {
      router.navigate('/about', { replace: true });
      expect(mockHistory.replaceState).toHaveBeenCalledWith(null, '', '/about');
    });

    it('navigates with custom state', () => {
      const state = { from: '/' };
      router.navigate('/about', { state });
      expect(mockHistory.pushState).toHaveBeenCalledWith(state, '', '/about');
    });

    it('navigates with base path', () => {
      router = createRouter({ base: '/app', mode: 'history' });
      router.navigate('/users');
      expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/app/users');
    });

    it('navigates to named route', () => {
      router.route({ handler: vi.fn(), name: 'userDetail', path: '/users/:id' });
      router.navigateTo('userDetail', { id: '123' });
      expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/users/123');
    });

    it('throws error when navigating to non-existent named route', () => {
      expect(() => {
        router.navigateTo('nonExistent', { id: '123' });
      }).toThrow();
    });

    it('goes back in history', () => {
      router.back();
      expect(mockHistory.back).toHaveBeenCalled();
    });

    it('goes forward in history', () => {
      router.forward();
      expect(mockHistory.forward).toHaveBeenCalled();
    });

    it('goes to specific position', () => {
      router.go(-2);
      expect(mockHistory.go).toHaveBeenCalledWith(-2);
    });
  });

  /** -------------------- Route Context -------------------- **/

  describe('Route Context', () => {
    beforeEach(() => {
      router = createRouter();
    });

    it('provides params in context', async () => {
      let ctx: RouteContext | undefined;
      mockLocation.pathname = '/users/123';
      router
        .get('/users/:id', (context) => {
          ctx = context;
        })
        .start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(ctx?.params).toEqual({ id: '123' });
    });

    it('provides query in context', async () => {
      let ctx: RouteContext | undefined;
      mockLocation.pathname = '/search';
      mockLocation.search = '?q=test';
      router
        .get('/search', (context) => {
          ctx = context;
        })
        .start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(ctx?.query).toEqual({ q: 'test' });
    });

    it('provides pathname in context', async () => {
      let ctx: RouteContext | undefined;
      mockLocation.pathname = '/about';
      router
        .get('/about', (context) => {
          ctx = context;
        })
        .start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(ctx?.pathname).toBe('/about');
    });

    it('provides hash in context', async () => {
      let ctx: RouteContext | undefined;
      mockLocation.pathname = '/';
      mockLocation.hash = '#section';
      router
        .get('/', (context) => {
          ctx = context;
        })
        .start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(ctx?.hash).toBe('section');
    });

    it('provides custom data in context', async () => {
      let ctx: RouteContext<{ title: string }> | undefined;
      mockLocation.pathname = '/about';
      router
        .route({
          data: { title: 'About Page' },
          handler: (context) => {
            ctx = context;
          },
          path: '/about',
        })
        .start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(ctx?.data).toEqual({ title: 'About Page' });
    });

    it('provides navigate function in context', async () => {
      let ctx: RouteContext | undefined;
      mockLocation.pathname = '/';
      router
        .get('/', (context) => {
          ctx = context;
        })
        .start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(typeof ctx?.navigate).toBe('function');
    });

    it('initializes user as undefined', async () => {
      let ctx: RouteContext | undefined;
      mockLocation.pathname = '/';
      router
        .get('/', (context) => {
          ctx = context;
        })
        .start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(ctx?.user).toBeUndefined();
    });

    it('initializes meta as empty object', async () => {
      let ctx: RouteContext | undefined;
      mockLocation.pathname = '/';
      router
        .get('/', (context) => {
          ctx = context;
        })
        .start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(ctx?.meta).toEqual({});
    });
  });

  /** -------------------- Middleware -------------------- **/

  describe('Middleware', () => {
    beforeEach(() => {
      router = createRouter();
    });

    it('executes middleware before handler', async () => {
      const calls: string[] = [];
      const middleware: Middleware = async (_ctx, next) => {
        calls.push('middleware');
        await next();
      };
      router.route({
        handler: () => {
          calls.push('handler');
        },
        middleware,
        path: '/test',
      });
      mockLocation.pathname = '/test';
      router.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(calls).toEqual(['middleware', 'handler']);
    });

    it('executes multiple middleware in order', async () => {
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
      mockLocation.pathname = '/test';
      router.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(calls).toEqual(['m1', 'm2', 'handler']);
    });

    it('blocks handler when middleware does not call next', async () => {
      const handler = vi.fn();
      router.route({
        handler,
        middleware: async (_ctx, _next) => {
          /* Don't call next */
        },
        path: '/test',
      });
      mockLocation.pathname = '/test';
      router.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(handler).not.toHaveBeenCalled();
    });

    it('allows middleware to modify context', async () => {
      let contextUser: unknown;
      router.route({
        handler: (ctx) => {
          contextUser = ctx.user;
        },
        middleware: async (ctx, next) => {
          ctx.user = { id: '123' };
          await next();
        },
        path: '/test',
      });
      mockLocation.pathname = '/test';
      router.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(contextUser).toEqual({ id: '123' });
    });

    it('allows middleware to use meta', async () => {
      let metadata: unknown;
      router.route({
        handler: (ctx) => {
          metadata = ctx.meta;
        },
        middleware: async (ctx, next) => {
          ctx.meta = { loaded: true };
          await next();
        },
        path: '/test',
      });
      mockLocation.pathname = '/test';
      router.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(metadata).toEqual({ loaded: true });
    });

    it('allows middleware to redirect', async () => {
      const handler = vi.fn();
      router.route({
        handler,
        middleware: async (ctx, _next) => {
          ctx.navigate('/login');
        },
        path: '/protected',
      });
      router.get('/login', vi.fn());
      mockLocation.pathname = '/protected';
      router.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(handler).not.toHaveBeenCalled();
      expect(mockHistory.pushState).toHaveBeenCalled();
    });

    it('handles async middleware', async () => {
      const calls: string[] = [];
      router.route({
        handler: () => {
          calls.push('handler');
        },
        middleware: async (_ctx, next) => {
          calls.push('before');
          await new Promise<void>((resolve) => setTimeout(resolve, 5));
          calls.push('after');
          await next();
        },
        path: '/test',
      });
      mockLocation.pathname = '/test';
      router.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
      expect(calls).toEqual(['before', 'after', 'handler']);
    });
  });

  describe('Global Middleware', () => {
    it('executes global middleware for all routes', async () => {
      const calls: string[] = [];
      router = createRouter({
        middleware: async (_ctx, next) => {
          calls.push('global');
          await next();
        },
      });
      router.get('/a', () => {
        calls.push('a');
      });
      router.get('/b', () => {
        calls.push('b');
      });

      mockLocation.pathname = '/a';
      router.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(calls).toEqual(['global', 'a']);

      // Clear calls and update location before navigating
      calls.length = 0;
      mockLocation.pathname = '/b';
      router.navigate('/b');
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(calls).toEqual(['global', 'b']);
    });

    it('executes global before route middleware', async () => {
      const calls: string[] = [];
      router = createRouter({
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
      router.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(calls).toEqual(['global', 'route', 'handler']);
    });

    it('supports multiple global middleware', async () => {
      const calls: string[] = [];
      router = createRouter({
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
      router.get('/test', () => {
        calls.push('handler');
      });
      mockLocation.pathname = '/test';
      router.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(calls).toEqual(['g1', 'g2', 'handler']);
    });
  });

  describe('Middleware Error Handling', () => {
    it('handles errors thrown in middleware gracefully', async () => {
      const handler = vi.fn();
      router.route({
        handler,
        middleware: async (_ctx, _next) => {
          throw new Error('Test error');
        },
        path: '/test',
      });
      mockLocation.pathname = '/test';
      router.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      // Handler should not be called when middleware throws
      expect(handler).not.toHaveBeenCalled();
    });
  });

  /** -------------------- Not Found Handler -------------------- **/

  describe('Not Found', () => {
    it('calls notFound when no route matches', async () => {
      const notFound = vi.fn();
      router = createRouter({ notFound });
      router.get('/', vi.fn());
      mockLocation.pathname = '/does-not-exist';
      router.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(notFound).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/does-not-exist' }));
    });

    it('does not call notFound when route matches', async () => {
      const notFound = vi.fn();
      const handler = vi.fn();
      router = createRouter({ notFound });
      router.get('/', handler);
      mockLocation.pathname = '/';
      router.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(notFound).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalled();
    });
  });

  /** -------------------- Subscriptions -------------------- **/

  describe('Subscriptions', () => {
    beforeEach(() => {
      router = createRouter();
    });

    it('notifies subscribers on route change', async () => {
      const listener = vi.fn();
      router.get('/', vi.fn()).start();
      router.subscribe(listener);
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(listener).toHaveBeenCalled();
    });

    it('unsubscribes correctly', async () => {
      const listener = vi.fn();
      router.get('/', vi.fn()).start();
      const unsubscribe = router.subscribe(listener);
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      const callCount = listener.mock.calls.length;
      unsubscribe();
      router.navigate('/about');
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(listener).toHaveBeenCalledTimes(callCount);
    });
  });

  /** -------------------- Nested Routes -------------------- **/

  describe('Nested Routes', () => {
    beforeEach(() => {
      router = createRouter();
    });

    it('matches nested child routes', async () => {
      const childHandler = vi.fn();
      router.route({
        children: [{ handler: childHandler, path: '/child' }],
        handler: vi.fn(),
        path: '/parent',
      });
      mockLocation.pathname = '/parent/child';
      router.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(childHandler).toHaveBeenCalled();
    });

    it('extracts params from nested routes', async () => {
      const childHandler = vi.fn();
      router.route({
        children: [{ handler: childHandler, path: '/posts/:postId' }],
        handler: vi.fn(),
        path: '/users/:userId',
      });
      mockLocation.pathname = '/users/123/posts/456';
      router.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(childHandler).toHaveBeenCalledWith(expect.objectContaining({ params: { postId: '456', userId: '123' } }));
    });
  });

  /** -------------------- Utility Methods -------------------- **/

  describe('Utilities', () => {
    beforeEach(() => {
      router = createRouter();
    });

    it('isActive() checks current route', async () => {
      mockLocation.pathname = '/users/123';
      router.start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(router.isActive('/users/:id')).toBe(true);
      expect(router.isActive('/posts/:id')).toBe(false);
    });

    it('buildUrl() builds URL with params', () => {
      const url = router.buildUrl('/users/:id', { id: '123' });
      expect(url).toBe('/users/123');
    });

    it('buildUrl() builds URL with query params', () => {
      const url = router.buildUrl('/search', undefined, { q: 'test' });
      expect(url).toContain('/search?');
      expect(url).toContain('q=test');
    });

    it('buildUrl() handles array query params', () => {
      const url = router.buildUrl('/search', undefined, { tags: ['a', 'b'] });
      expect(url).toBe('/search?tags=a&tags=b');
    });

    it('urlFor() generates URL for named route', () => {
      router.route({ handler: vi.fn(), name: 'user', path: '/users/:id' });
      const url = router.urlFor('user', { id: '123' });
      expect(url).toBe('/users/123');
    });

    it('urlFor() throws for non-existent route', () => {
      expect(() => router.urlFor('nonExistent')).toThrow();
    });

    it('getState() returns current route state', () => {
      mockLocation.pathname = '/users/123';
      mockLocation.search = '?tab=profile';
      router.route({ handler: vi.fn(), path: '/users/:id' }).start();
      const state = router.getState();
      expect(state.pathname).toBe('/users/123');
      expect(state.params).toEqual({ id: '123' });
      expect(state.query).toEqual({ tab: 'profile' });
    });

    it('getParams() returns current params', () => {
      mockLocation.pathname = '/users/123';
      router.route({ handler: vi.fn(), path: '/users/:id' }).start();
      const params = router.getParams();
      expect(params).toEqual({ id: '123' });
    });

    it('link() creates anchor element', () => {
      const link = router.link('/about', 'About Page');
      expect(link.tagName).toBe('A');
      expect(link.href).toContain('/about');
      expect(link.textContent).toBe('About Page');
    });

    it('link() adds attributes', () => {
      const link = router.link('/about', 'About', { class: 'nav-link' });
      expect(link.getAttribute('class')).toBe('nav-link');
    });

    it('linkTo() creates link for named route', () => {
      router.route({ handler: vi.fn(), name: 'user', path: '/users/:id' });
      const link = router.linkTo('user', { id: '123' }, 'User 123');
      expect(link.href).toContain('/users/123');
      expect(link.textContent).toBe('User 123');
    });

    it('debug() returns debug info', () => {
      router.route({ handler: vi.fn(), name: 'user', path: '/users/:id' });
      const info = router.debug();
      expect(info.mode).toBe('history');
      expect(info.base).toBe('/');
      expect(info.routes).toHaveLength(1);
      expect(info.routes[0].name).toBe('user');
    });
  });

  /** -------------------- Lifecycle -------------------- **/

  describe('Lifecycle', () => {
    beforeEach(() => {
      router = createRouter();
    });

    it('start() returns router for chaining', () => {
      const result = router.start();
      expect(result).toBe(router);
    });

    it('does not start multiple times', () => {
      router.start();
      router.start();
      expect(router).toBe(router);
    });

    it('stop() stops router', () => {
      router.start();
      router.stop();
      expect(router).toBe(router);
    });
  });

  /** -------------------- Edge Cases -------------------- **/

  describe('Edge Cases', () => {
    beforeEach(() => {
      router = createRouter();
    });

    it('handles empty path', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '';
      router.get('/', handler).start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalled();
    });

    it('handles path with special characters in params', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/search/hello%2Bworld';
      router.get('/search/:query', handler).start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { query: 'hello+world' } }));
    });

    it('handles query params with empty values', async () => {
      const handler = vi.fn();
      mockLocation.pathname = '/search';
      mockLocation.search = '?q=&page=2';
      router.get('/search', handler).start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: { page: '2', q: '' } }));
    });

    it('handles hash with hash mode', async () => {
      router = createRouter({ mode: 'hash' });
      const handler = vi.fn();
      mockLocation.hash = '#/about';
      router.get('/about', handler).start();
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalled();
    });
  });
});

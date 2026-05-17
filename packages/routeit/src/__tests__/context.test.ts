/**
 * Route context and middleware pipeline.
 */
import type { RouteContext } from '../types';

import { createMemoryHistory, createRouter } from '../router';
import { settle } from './test-utils';

describe('route context', () => {
  it('exposes params, query, pathname, hash, historyState, locals, and navigate', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/users/42?tab=info#hash');
    const router = createRouter({
      history,
      routes: { user: { handler, path: '/users/:id' } },
    });

    await settle();

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        hash: 'hash',
        historyState: null,
        locals: {},
        navigate: expect.any(Function),
        params: { id: '42' },
        pathname: '/users/42',
        query: { tab: 'info' },
      }),
    );
    router.dispose();
  });

  it('ctx.data is undefined during middleware (data runs after the middleware chain)', async () => {
    let dataInMiddleware: unknown = 'NOT_SET';
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: {
          data: async () => ({ value: 42 }),
          handler: vi.fn(),
          middleware: [
            async (ctx, next) => {
              dataInMiddleware = ctx.data;
              await next();
            },
          ],
          path: '/',
        },
      },
    });

    await settle();

    expect(dataInMiddleware).toBeUndefined();
    router.dispose();
  });

  it('locals object is shared across middleware and handler', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: {
          handler,
          middleware: [
            async (ctx: RouteContext, next) => {
              ctx.locals.user = 'alice';
              await next();
            },
          ],
          path: '/',
        },
      },
    });

    await settle();

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ locals: { user: 'alice' } }));
    router.dispose();
  });
});

describe('middleware pipeline', () => {
  it('global middleware runs before route middleware before the handler', async () => {
    const calls: string[] = [];
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      middleware: [
        async (_ctx, next) => {
          calls.push('global');
          await next();
        },
      ],
      routes: {
        home: {
          handler: () => calls.push('handler'),
          middleware: [
            async (_ctx, next) => {
              calls.push('route');
              await next();
            },
          ],
          path: '/',
        },
      },
    });

    await settle();

    expect(calls).toEqual(['global', 'route', 'handler']);
    router.dispose();
  });

  it('middleware that does not call next() blocks the handler', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { handler, middleware: [vi.fn()], path: '/' },
      },
    });

    await settle();

    expect(handler).not.toHaveBeenCalled();
    router.dispose();
  });

  it('blocking middleware does not commit destination location', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        protected: {
          middleware: [async () => undefined],
          path: '/protected',
        },
      },
    });

    await settle();
    await router.navigate({ path: '/protected' });

    expect(router.state.location.pathname).toBe('/');
    expect(router.state.status).toBe('idle');
    router.dispose();
  });

  it('blocking middleware does not leave state stuck in loading', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        protected: {
          data: async () => ({ ok: true }),
          middleware: [async () => undefined],
          path: '/protected',
        },
      },
    });

    await settle();
    await router.navigate({ path: '/protected' });

    expect(router.state.location.pathname).toBe('/');
    expect(router.state.status).toBe('idle');
    router.dispose();
  });

  it('middleware can act as an error boundary around next()', async () => {
    const caught = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      middleware: [
        async (ctx: RouteContext, next) => {
          try {
            await next();
          } catch (error) {
            caught(error);
            ctx.locals.errorHandled = true;
          }
        },
      ],
      routes: {
        home: {
          handler: () => {
            throw new Error('boom');
          },
          path: '/',
        },
      },
    });

    await settle();

    expect(caught).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
    router.dispose();
  });

  it('throws when next() is called more than once', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        invalid: {
          middleware: [
            async (_ctx: RouteContext, next) => {
              await next();
              await next();
            },
          ],
          path: '/invalid',
        },
      },
    });

    await settle();

    await expect(router.navigate({ path: '/invalid' })).rejects.toThrow('[routeit] next() called multiple times');
    router.dispose();
  });
});

describe('navigation from context', () => {
  it('ctx.navigate() named target redirects without running the original handler', async () => {
    const source = vi.fn();
    const target = vi.fn();
    const history = createMemoryHistory('/from');
    const router = createRouter({
      history,
      routes: {
        from: {
          handler: source,
          middleware: [
            async (ctx: RouteContext) => {
              await ctx.navigate({ name: 'target' });
            },
          ],
          path: '/from',
        },
        target: { handler: target, path: '/target' },
      },
    });

    await settle();

    expect(source).not.toHaveBeenCalled();
    expect(target).toHaveBeenCalled();
    router.dispose();
  });

  it('ctx.navigate() raw path forwards query params to the destination handler', async () => {
    const target = vi.fn();
    const history = createMemoryHistory('/from');
    const router = createRouter({
      history,
      routes: {
        from: {
          middleware: [
            async (ctx: RouteContext) => {
              await ctx.navigate({ path: '/target?mode=edit' });
            },
          ],
          path: '/from',
        },
        target: { handler: target, path: '/target' },
      },
    });

    await settle();

    expect(target).toHaveBeenCalledWith(expect.objectContaining({ query: { mode: 'edit' } }));
    router.dispose();
  });
});

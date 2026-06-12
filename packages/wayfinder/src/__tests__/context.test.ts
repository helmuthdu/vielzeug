/**
 * Route context and middleware pipeline.
 */
import type { RouteContext } from '../types';

import { createMemoryHistory, createRouter } from '../';
import { settle } from './test-utils';

describe('route context', () => {
  it('exposes params, query, pathname, hash, historyState, locals, and navigate', async () => {
    const dataFn = vi.fn();
    const history = createMemoryHistory('/users/42?tab=info#hash');
    const router = createRouter({
      history,
      routes: { user: { data: dataFn, path: '/users/:id' } },
    });

    await settle();

    expect(dataFn).toHaveBeenCalledWith(
      expect.objectContaining({
        hash: 'hash',
        historyState: null,
        locals: {},
        navigate: expect.any(Function),
        params: { id: '42' },
        pathname: '/users/42',
        query: { tab: 'info' },
        signal: expect.any(AbortSignal),
      }),
    );
    router.dispose();
  });

  it('data fn result is stored in matches; middleware does not have a data property', async () => {
    let middlewareHasData = false;
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: {
          data: async () => ({ value: 42 }),
          middleware: [
            async (ctx, next) => {
              // ctx is RouteContext — data is not present (TypeScript prevents access)
              middlewareHasData = 'data' in ctx;
              await next();
            },
          ],
          path: '/',
        },
      },
    });

    await settle();

    expect(middlewareHasData).toBe(false);
    expect(router.getSnapshot().matches.at(-1)?.data).toEqual({ value: 42 });
    router.dispose();
  });

  it('locals object is shared across middleware functions', async () => {
    let localsAtEnd: Record<string, unknown> = {};
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: {
          data: (ctx) => {
            localsAtEnd = { ...ctx.locals };
          },
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

    expect(localsAtEnd).toEqual({ user: 'alice' });
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
          data: () => {
            calls.push('handler');
          },
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
        home: { data: handler, middleware: [vi.fn()], path: '/' },
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

    expect(router.getSnapshot().location.pathname).toBe('/');
    expect(router.getSnapshot().status).toBe('idle');
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

    expect(router.getSnapshot().location.pathname).toBe('/');
    expect(router.getSnapshot().status).toBe('idle');
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
          data: () => {
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

    await expect(router.navigate({ path: '/invalid' })).rejects.toThrow('[wayfinder] next() called multiple times');
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
          data: source,
          middleware: [
            async (ctx: RouteContext) => {
              await ctx.navigate({ name: 'target' });
            },
          ],
          path: '/from',
        },
        target: { data: target, path: '/target' },
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
        target: { data: target, path: '/target' },
      },
    });

    await settle();

    expect(target).toHaveBeenCalledWith(expect.objectContaining({ query: { mode: 'edit' } }));
    router.dispose();
  });
});

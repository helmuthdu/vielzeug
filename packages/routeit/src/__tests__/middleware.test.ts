import type { RouteContext } from '../types';

import { createRouter, defineRoutes } from '../router';
import { boot, disposeRouter, mockLocation, resetMocks } from './setup';

describe('Route context & middleware', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    disposeRouter();
  });

  it('exposes params, query, pathname, hash, locals, and navigation helpers in ctx', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/users/42';
    mockLocation.search = '?tab=info';
    mockLocation.hash = '#hash';
    await boot(
      createRouter({
        routes: defineRoutes({
          userDetail: { handler, path: '/users/:id' },
        }),
      }),
    );

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        hash: 'hash',
        locals: {},
        navigate: expect.any(Function),
        params: { id: '42' },
        pathname: '/users/42',
        pushPath: expect.any(Function),
        query: { tab: 'info' },
        replacePath: expect.any(Function),
      }),
    );
  });

  it('passes route meta into the route context', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/meta';
    await boot(
      createRouter({
        routes: defineRoutes({
          metaPage: { handler, meta: { data: 1 }, path: '/meta' },
        }),
      }),
    );

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ meta: { data: 1 } }));
  });

  it('shares locals across middleware and the handler', async () => {
    const handler = vi.fn();
    const middleware = vi.fn(async (ctx: RouteContext, next: () => Promise<void>) => {
      ctx.locals.user = 'alice';
      await next();
    });

    mockLocation.pathname = '/local';
    await boot(
      createRouter({
        routes: defineRoutes({
          local: { handler, middleware, path: '/local' },
        }),
      }),
    );

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ locals: { user: 'alice' } }));
  });

  it('runs global middleware before route middleware and the handler', async () => {
    const calls: string[] = [];
    const globalMiddleware = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
      calls.push('global');
      await next();
    });
    const routeMiddleware = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
      calls.push('route');
      await next();
    });

    mockLocation.pathname = '/global';
    await boot(
      createRouter({
        middleware: [globalMiddleware],
        routes: defineRoutes({
          global: {
            handler: () => {
              calls.push('handler');
            },
            middleware: [routeMiddleware],
            path: '/global',
          },
        }),
      }),
    );

    expect(calls).toEqual(['global', 'route', 'handler']);
  });

  it('ctx.navigate() can redirect without continuing the original handler', async () => {
    const source = vi.fn();
    const target = vi.fn();
    const redirect = vi.fn(async (ctx: RouteContext) => {
      await ctx.navigate({ name: 'target' });
    });

    mockLocation.pathname = '/from';
    await boot(
      createRouter({
        routes: defineRoutes({
          from: { handler: source, middleware: [redirect], path: '/from' },
          target: { handler: target, path: '/target' },
        }),
      }),
    );

    expect(source).not.toHaveBeenCalled();
    expect(target).toHaveBeenCalled();
  });

  it('pushPath() can redirect to one-off raw destinations', async () => {
    const target = vi.fn();
    const redirect = vi.fn(async (ctx: RouteContext) => {
      await ctx.pushPath('/target?mode=edit');
    });

    mockLocation.pathname = '/from';
    await boot(
      createRouter({
        routes: defineRoutes({
          from: { middleware: [redirect], path: '/from' },
          target: { handler: target, path: '/target' },
        }),
      }),
    );

    expect(target).toHaveBeenCalledWith(expect.objectContaining({ query: { mode: 'edit' } }));
  });

  it('middleware that does not call next() blocks the handler', async () => {
    const handler = vi.fn();
    const middleware = vi.fn();

    mockLocation.pathname = '/stop';
    await boot(
      createRouter({
        routes: defineRoutes({
          stop: { handler, middleware: [middleware], path: '/stop' },
        }),
      }),
    );

    expect(handler).not.toHaveBeenCalled();
  });

  it('middleware can act as an error boundary for route handlers', async () => {
    const caught = vi.fn();
    const boundary = vi.fn(async (ctx: RouteContext, next: () => Promise<void>) => {
      try {
        await next();
      } catch (error) {
        caught(error);
        ctx.locals.errorHandled = true;
      }
    });

    mockLocation.pathname = '/boom';
    await boot(
      createRouter({
        middleware: [boundary],
        routes: defineRoutes({
          boom: {
            handler: () => {
              throw new Error('boom');
            },
            path: '/boom',
          },
        }),
      }),
    );

    expect(caught).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
  });

  it('throws when next() is called multiple times', async () => {
    const router = createRouter({
      routes: defineRoutes({
        invalid: {
          middleware: [
            async (_ctx: RouteContext, next: () => Promise<void>) => {
              await next();
              await next();
            },
          ],
          path: '/invalid',
        },
      }),
    });

    mockLocation.pathname = '/';
    await boot(router);

    await expect(router.pushPath('/invalid')).rejects.toThrow('[routeit] next() called multiple times');
  });
});

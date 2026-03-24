import type { RouteContext } from '../types';

import { createRouter } from '../router';
import { boot, disposeRouter, mockLocation, resetMocks } from './setup';

describe('Route context & middleware', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    disposeRouter();
  });

  it('ctx exposes params, query, pathname, hash, locals, and navigate', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/users/42';
    mockLocation.search = '?tab=info';
    mockLocation.hash = '#hash';
    await boot(createRouter().on('/users/:id', handler));
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        hash: 'hash',
        locals: {},
        navigate: expect.any(Function),
        params: { id: '42' },
        pathname: '/users/42',
        query: { tab: 'info' },
      }),
    );
  });

  it('ctx.meta is populated from the route definition', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/meta';
    await boot(createRouter().on('/meta', handler, { meta: { data: 1 } }));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ meta: { data: 1 } }));
  });

  it('locals mutated by middleware are visible in the subsequent handler', async () => {
    const handler = vi.fn();
    const mw = vi.fn(async (ctx: RouteContext, next: () => Promise<void>) => {
      ctx.locals.user = 'alice';
      await next();
    });

    mockLocation.pathname = '/local';
    await boot(createRouter().on('/local', handler, { middleware: [mw] }));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ locals: { user: 'alice' } }));
  });

  it('ctx.navigate() from inside a handler triggers a programmatic navigation', async () => {
    const handler = vi.fn(async (ctx: RouteContext) => {
      if (ctx.pathname === '/from') await ctx.navigate('/to');
    });

    (globalThis as any).mockLocation.pathname = '/from';
    await boot(createRouter().on('/from', handler).on('/to', vi.fn()));

    expect(handler).toHaveBeenCalled();
  });

  it('ctx.navigate() in middleware can redirect and block the original handler', async () => {
    const handler = vi.fn();
    const redirect = vi.fn(async (ctx: RouteContext) => {
      await ctx.navigate('/redirect');
    });

    (globalThis as any).mockLocation.pathname = '/from';
    await boot(
      createRouter()
        .on('/from', handler, { middleware: [redirect] })
        .on('/redirect', vi.fn()),
    );

    expect(handler).not.toHaveBeenCalled();
  });

  describe('Middleware chain', () => {
    it('a single middleware runs before the handler', async () => {
      const calls: string[] = [];
      const mw = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
        calls.push('mw');
        await next();
      });

      (globalThis as any).mockLocation.pathname = '/chain';
      await boot(createRouter().on('/chain', () => calls.push('h'), { middleware: [mw] }));
      expect(calls).toEqual(['mw', 'h']);
    });

    it('array middleware runs in declaration order', async () => {
      const calls: string[] = [];
      const mw1 = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
        calls.push('mw1');
        await next();
      });
      const mw2 = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
        calls.push('mw2');
        await next();
      });

      (globalThis as any).mockLocation.pathname = '/order';
      await boot(createRouter().on('/order', () => calls.push('h'), { middleware: [mw1, mw2] }));
      expect(calls).toEqual(['mw1', 'mw2', 'h']);
    });

    it('middleware that omits next() blocks the handler', async () => {
      const handler = vi.fn();
      const mw = vi.fn();

      (globalThis as any).mockLocation.pathname = '/stop';
      await boot(createRouter().on('/stop', handler, { middleware: [mw] }));
      expect(handler).not.toHaveBeenCalled();
    });

    it('async middleware is awaited before calling the handler', async () => {
      const calls: string[] = [];
      const mw = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
        await new Promise((r) => setTimeout(r, 1));
        calls.push('mw');
        await next();
      });

      (globalThis as any).mockLocation.pathname = '/async';
      await boot(createRouter().on('/async', () => calls.push('h'), { middleware: [mw] }));
      expect(calls).toEqual(['mw', 'h']);
    });

    it('locals mutated by middleware are available to downstream middleware', async () => {
      const calls: string[] = [];
      const mw1 = vi.fn(async (ctx: RouteContext, next: () => Promise<void>) => {
        ctx.locals.value = 1;
        await next();
      });
      const mw2 = vi.fn(async (ctx: RouteContext, next: () => Promise<void>) => {
        calls.push(<string>ctx.locals.value);
        await next();
      });

      (globalThis as any).mockLocation.pathname = '/locals';
      await boot(createRouter().on('/locals', () => calls.push('h'), { middleware: [mw1, mw2] }));
      expect(calls).toEqual([1, 'h']);
    });

    it('global middleware (RouterOptions.middleware) runs before route-level middleware', async () => {
      const calls: string[] = [];
      const globalMw = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
        calls.push('global');
        await next();
      });
      const routeMw = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
        calls.push('route');
        await next();
      });

      (globalThis as any).mockLocation.pathname = '/global';
      await boot(
        createRouter({ middleware: [globalMw] }).on('/global', () => calls.push('h'), { middleware: [routeMw] }),
      );
      expect(calls).toEqual(['global', 'route', 'h']);
    });

    it('global middleware runs before every route handler', async () => {
      const calls: string[] = [];
      const globalMw = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
        calls.push('global');
        await next();
      });

      const router = createRouter({ middleware: [globalMw] });

      (globalThis as any).mockLocation.pathname = '/a';
      await boot(router.on('/a', () => calls.push('a')));

      router.on('/b', () => calls.push('b'));
      await router.navigate('/b');

      expect(calls).toEqual(['global', 'a', 'global', 'b']);
    });

    it('multiple global middleware run in declaration order', async () => {
      const calls: string[] = [];
      const g1 = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
        calls.push('g1');
        await next();
      });
      const g2 = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
        calls.push('g2');
        await next();
      });

      (globalThis as any).mockLocation.pathname = '/multi';
      await boot(createRouter({ middleware: [g1, g2] }).on('/multi', () => calls.push('h')));
      expect(calls).toEqual(['g1', 'g2', 'h']);
    });

    it('use() adds global middleware after construction', async () => {
      const calls: string[] = [];
      const g1 = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
        calls.push('g1');
        await next();
      });
      const g2 = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
        calls.push('g2');
        await next();
      });

      const router = createRouter({ middleware: [g1] });

      router.use(g2);

      (globalThis as any).mockLocation.pathname = '/use';
      await boot(router.on('/use', () => calls.push('h')));
      expect(calls).toEqual(['g1', 'g2', 'h']);
    });

    it('use() accepts multiple middleware at once, all run in order', async () => {
      const calls: string[] = [];
      const g1 = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
        calls.push('g1');
        await next();
      });
      const g2 = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
        calls.push('g2');
        await next();
      });

      const router = createRouter({ middleware: [g1] });

      router.use(g2, g1);

      (globalThis as any).mockLocation.pathname = '/multiuse';
      await boot(router.on('/multiuse', () => calls.push('h')));
      expect(calls).toEqual(['g1', 'g2', 'g1', 'h']);
    });

    it('use() middleware runs after middleware registered at construction', async () => {
      const calls: string[] = [];
      const g1 = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
        calls.push('g1');
        await next();
      });
      const g2 = vi.fn(async (_ctx: RouteContext, next: () => Promise<void>) => {
        calls.push('g2');
        await next();
      });

      const router = createRouter({ middleware: [g1] });

      router.use(g2);

      (globalThis as any).mockLocation.pathname = '/after';
      await boot(router.on('/after', () => calls.push('h')));
      expect(calls).toEqual(['g1', 'g2', 'h']);
    });

    it('middleware can redirect by calling ctx.navigate() without calling next()', async () => {
      const handler = vi.fn();
      const redirect = vi.fn(async (ctx: RouteContext) => {
        await ctx.navigate('/redirect');
      });

      (globalThis as any).mockLocation.pathname = '/from';
      await boot(
        createRouter()
          .on('/from', handler, { middleware: [redirect] })
          .on('/redirect', vi.fn()),
      );
      expect(handler).not.toHaveBeenCalled();
    });
  });
});

import type { RouteContext } from '../types';

import { createRouter } from '../router';
import { boot, disposeRouter, mockLocation, resetMocks } from './setup';

describe('Route registration', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    disposeRouter();
  });

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

    router.group(
      '/admin',
      (r) =>
        r.on('/users', () => {
          calls.push('users');
        }),
      { middleware: [auth] },
    );

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
      createRouter().group(
        '/g',
        (r) =>
          r.on(
            '/page',
            () => {
              order.push('handler');
            },
            { middleware: [routeMw] },
          ),
        {
          middleware: [groupMw],
        },
      ),
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
          inner.on('/:id', () => {
            calls.push('handler');
          });
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

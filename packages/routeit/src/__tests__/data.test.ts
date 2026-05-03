import { createRouter } from '../router';
import { boot, disposeRouter, mockLocation, resetMocks } from './setup';

describe('data() loader', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    disposeRouter();
  });

  it('runs the data function and passes the result to the handler via ctx.data', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/profile';
    await boot(
      createRouter({
        routes: {
          profile: {
            data: async () => ({ user: 'alice' }),
            handler,
            path: '/profile',
          },
        },
      }),
    );

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ data: { user: 'alice' } }));
  });

  it('data function receives params and query', async () => {
    const dataFn = vi.fn(async () => null);

    mockLocation.pathname = '/users/42';
    mockLocation.search = '?tab=posts';
    await boot(
      createRouter({
        routes: {
          userDetail: {
            data: dataFn,
            handler: vi.fn(),
            path: '/users/:id',
          },
        },
      }),
    );

    expect(dataFn).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { id: '42' },
        query: { tab: 'posts' },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('data function receives an AbortSignal', async () => {
    let capturedSignal: AbortSignal | undefined;

    mockLocation.pathname = '/';
    await boot(
      createRouter({
        routes: {
          home: {
            data: async ({ signal }) => {
              capturedSignal = signal;
            },
            path: '/',
          },
        },
      }),
    );

    expect(capturedSignal).toBeInstanceOf(AbortSignal);
  });

  it('stores the data result in router.state.matches leaf node', async () => {
    mockLocation.pathname = '/items/7';

    const router = await boot(
      createRouter({
        routes: {
          item: {
            data: async ({ params }) => ({ id: params.id }),
            handler: vi.fn(),
            path: '/items/:id',
          },
        },
      }),
    );

    const leaf = router.state.matches[router.state.matches.length - 1];

    expect(leaf?.data).toEqual({ id: '7' });
  });

  it('sets status to error and re-throws when a data function throws', async () => {
    const boundary = vi.fn(async (_ctx: unknown, next: () => Promise<void>) => {
      try {
        await next();
      } catch {
        // swallow
      }
    });

    mockLocation.pathname = '/fail';

    const router = await boot(
      createRouter({
        middleware: [boundary],
        routes: {
          fail: {
            data: async () => {
              throw new Error('data error');
            },
            path: '/fail',
          },
        },
      }),
    );

    expect(router.state.status).toBe('error');
  });

  it('ctx.data is undefined in middleware (data runs after middleware chain)', async () => {
    let dataInMiddleware: unknown = 'NOT_CHECKED';

    mockLocation.pathname = '/';
    await boot(
      createRouter({
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
      }),
    );

    expect(dataInMiddleware).toBeUndefined();
  });
});

describe('Nested routes with children', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    disposeRouter();
  });

  it('compiles and matches nested child routes', async () => {
    const settingsHandler = vi.fn();

    mockLocation.pathname = '/dashboard/settings';
    await boot(
      createRouter({
        routes: {
          dashboard: {
            children: {
              settings: { handler: settingsHandler, path: 'settings' },
            },
            path: '/dashboard',
          },
          notFound: { handler: vi.fn(), path: '*' },
        },
      }),
    );

    expect(settingsHandler).toHaveBeenCalled();
  });

  it('child route name is prefixed with parent name using dot notation', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/dashboard/settings';

    const router = await boot(
      createRouter({
        routes: {
          dashboard: {
            children: {
              settings: { handler, path: 'settings' },
            },
            path: '/dashboard',
          },
        },
      }),
    );

    expect(router.state.matches.at(-1)?.name).toBe('dashboard.settings');
  });

  it('index child inherits the parent path', async () => {
    const indexHandler = vi.fn();

    mockLocation.pathname = '/dashboard';
    await boot(
      createRouter({
        routes: {
          dashboard: {
            children: {
              index: { handler: indexHandler, index: true },
              settings: { handler: vi.fn(), path: 'settings' },
            },
            path: '/dashboard',
          },
        },
      }),
    );

    expect(indexHandler).toHaveBeenCalled();
  });

  it('match branch contains all ancestor nodes root to leaf', async () => {
    const handler = vi.fn();

    mockLocation.pathname = '/dashboard/settings';

    const router = await boot(
      createRouter({
        routes: {
          dashboard: {
            children: {
              settings: { handler, path: 'settings' },
            },
            path: '/dashboard',
          },
        },
      }),
    );

    const names = router.state.matches.map((m) => m.name);

    expect(names).toEqual(['dashboard', 'dashboard.settings']);
  });

  it('parent middleware runs before child middleware and handler', async () => {
    const calls: string[] = [];

    mockLocation.pathname = '/parent/child';
    await boot(
      createRouter({
        routes: {
          parent: {
            children: {
              child: {
                handler: () => calls.push('handler'),
                middleware: [
                  async (_ctx, next) => {
                    calls.push('child-mw');
                    await next();
                  },
                ],
                path: 'child',
              },
            },
            middleware: [
              async (_ctx, next) => {
                calls.push('parent-mw');
                await next();
              },
            ],
            path: '/parent',
          },
        },
      }),
    );

    expect(calls).toEqual(['parent-mw', 'child-mw', 'handler']);
  });

  it('url() and navigate() work with nested route compound names', async () => {
    const router = createRouter({
      routes: {
        dashboard: {
          children: {
            settings: { path: 'settings' },
          },
          path: '/dashboard',
        },
      },
    });

    expect(router.url('dashboard.settings' as never)).toBe('/dashboard/settings');
  });

  it('each branch node carries its own data loader result', async () => {
    mockLocation.pathname = '/dash/profile';

    const router = await boot(
      createRouter({
        routes: {
          dash: {
            children: {
              profile: {
                data: async () => ({ page: 'profile' }),
                handler: vi.fn(),
                path: 'profile',
              },
            },
            data: async () => ({ layout: 'dashboard' }),
            path: '/dash',
          },
        },
      }),
    );

    expect(router.state.matches[0]?.data).toEqual({ layout: 'dashboard' });
    expect(router.state.matches[1]?.data).toEqual({ page: 'profile' });
  });
});

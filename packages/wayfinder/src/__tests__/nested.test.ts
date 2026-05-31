/**
 * Nested route structure — compilation, naming, middleware ordering,
 * and per-node data loaders.
 */
import { createMemoryHistory, createRouter } from '../';
import { settle } from './test-utils';

describe('nested routes', () => {
  it('compiles and matches nested child routes', async () => {
    const data = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/dashboard/settings'),
      routes: {
        dashboard: {
          children: {
            settings: { data, path: 'settings' },
          },
          path: '/dashboard',
        },
      },
    });

    await settle();

    expect(data).toHaveBeenCalled();
    router.dispose();
  });

  it('child route name is prefixed with the parent name using dot notation', async () => {
    const router = createRouter({
      history: createMemoryHistory('/dashboard/settings'),
      routes: {
        dashboard: {
          children: { settings: { path: 'settings' } },
          path: '/dashboard',
        },
      },
    });

    await settle();

    expect(router.getSnapshot().matches.at(-1)?.name).toBe('dashboard.settings');
    router.dispose();
  });

  it('index child inherits the parent path', async () => {
    const data = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/dashboard'),
      routes: {
        dashboard: {
          children: {
            index: { data, index: true },
            settings: { path: 'settings' },
          },
          path: '/dashboard',
        },
      },
    });

    await settle();

    expect(data).toHaveBeenCalled();
    router.dispose();
  });

  it('match branch contains all ancestor nodes root to leaf', async () => {
    const router = createRouter({
      history: createMemoryHistory('/dashboard/settings'),
      routes: {
        dashboard: {
          children: { settings: { path: 'settings' } },
          path: '/dashboard',
        },
      },
    });

    await settle();

    expect(router.getSnapshot().matches.map((m) => m.name)).toEqual(['dashboard', 'dashboard.settings']);
    router.dispose();
  });

  it('parent middleware runs before child middleware before the handler', async () => {
    const calls: string[] = [];
    const router = createRouter({
      history: createMemoryHistory('/parent/child'),
      routes: {
        parent: {
          children: {
            child: {
              data: () => {
                calls.push('handler');
              },
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
    });

    await settle();

    expect(calls).toEqual(['parent-mw', 'child-mw', 'handler']);
    router.dispose();
  });

  it('url() accepts compound dot-notation names for nested routes', () => {
    const router = createRouter({
      routes: {
        dashboard: {
          children: { settings: { path: 'settings' } },
          path: '/dashboard',
        },
      },
    });

    expect(router.url('dashboard.settings' as never)).toBe('/dashboard/settings');
    router.dispose();
  });

  it('each branch node carries its own data loader result', async () => {
    const router = createRouter({
      history: createMemoryHistory('/dash/profile'),
      routes: {
        dash: {
          children: {
            profile: {
              data: async () => ({ page: 'profile' }),
              path: 'profile',
            },
          },
          data: async () => ({ layout: 'dashboard' }),
          path: '/dash',
        },
      },
    });

    await settle();

    expect(router.getSnapshot().matches[0]?.data).toEqual({ layout: 'dashboard' });
    expect(router.getSnapshot().matches[1]?.data).toEqual({ page: 'profile' });
    router.dispose();
  });
});

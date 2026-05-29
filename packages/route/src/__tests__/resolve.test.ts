/**
 * resolve() — synchronous pathname-to-branch resolution without side effects.
 */
import { createMemoryHistory, createRouter } from '../';
import { settle } from './test-utils';

describe('resolve()', () => {
  it('returns a match branch for a matched pathname', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        user: { meta: { section: 'users' }, path: '/users/:id' },
      },
    });

    await settle();

    const branch = router.resolve('/users/42');

    expect(branch).not.toBeNull();
    expect(branch?.at(-1)?.name).toBe('user');
    expect(branch?.at(-1)?.params).toEqual({ id: '42' });
    router.dispose();
  });

  it('returns null for an unmatched pathname', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' } },
    });

    await settle();

    expect(router.resolve('/does-not-exist')).toBeNull();
    router.dispose();
  });

  it('returns null for a redirect route', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        new: { path: '/new' },
        old: { path: '/old', redirect: { path: '/new' } },
      },
    });

    await settle();

    // Redirect routes do not produce a usable branch — callers must use match() for that.
    expect(router.resolve('/old')).toBeNull();
    router.dispose();
  });

  it('does not modify router state', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: { path: '/page' },
      },
    });

    await settle();

    router.resolve('/page');

    expect(router.getSnapshot().location.pathname).toBe('/');
    router.dispose();
  });

  it('strips the router base before resolving', async () => {
    const history = createMemoryHistory('/app/');
    const router = createRouter({
      base: '/app',
      history,
      routes: {
        home: { path: '/' },
        page: { path: '/page' },
      },
    });

    await settle();

    const branch = router.resolve('/page');

    expect(branch?.at(-1)?.name).toBe('page');
    router.dispose();
  });

  it('data is undefined for all branch nodes (no data loaders run)', async () => {
    const dataFn = vi.fn(async () => ({ loaded: true }));
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: { data: dataFn, path: '/page' },
      },
    });

    await settle();

    const branch = router.resolve('/page');

    expect(branch?.at(-1)?.data).toBeUndefined();
    expect(dataFn).not.toHaveBeenCalled();
    router.dispose();
  });

  it('branch contains all ancestor nodes root to leaf for nested routes', async () => {
    const history = createMemoryHistory('/dashboard/settings');
    const router = createRouter({
      history,
      routes: {
        dashboard: {
          children: { settings: { path: 'settings' } },
          path: '/dashboard',
        },
      },
    });

    await settle();

    const branch = router.resolve('/dashboard/settings');

    expect(branch?.map((n) => n.name)).toEqual(['dashboard', 'dashboard.settings']);
    router.dispose();
  });
});

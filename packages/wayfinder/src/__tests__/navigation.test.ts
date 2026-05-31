import { createMemoryHistory, createRouter } from '../';
import { boot, disposeRouter, mockHistory, mockLocation, resetMocks } from './setup';
import { createDeferred, settle } from './test-utils';

const routes = {
  about: { path: '/about' },
  home: { path: '/' },
  search: { path: '/search' },
  userDetail: { meta: { section: 'users' }, path: '/users/:id' },
  users: { path: '/users' },
};

describe('Navigation', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    disposeRouter();
  });

  describe('history navigation', () => {
    it('calls pushState with the resolved named route URL', async () => {
      const router = createRouter({
        routes: {
          ...routes,
          about: { data: vi.fn(), path: '/about' },
        },
      });

      mockLocation.pathname = '/';
      await boot(router);

      await router.navigate({ name: 'about' });
      expect(mockHistory.pushState).toHaveBeenCalledWith(undefined, '', '/about');
    });

    it('{ replace: true } calls replaceState instead of pushState', async () => {
      const router = createRouter({
        routes: {
          about: { data: vi.fn(), path: '/about' },
        },
      });

      mockLocation.pathname = '/';
      await boot(router);

      await router.navigate({ name: 'about' }, { replace: true });
      expect(mockHistory.replaceState).toHaveBeenCalledWith(undefined, '', '/about');
    });

    it('{ state } is forwarded to history state', async () => {
      const router = createRouter({
        routes: {
          about: { data: vi.fn(), path: '/about' },
        },
      });

      mockLocation.pathname = '/';
      await boot(router);

      await router.navigate({ name: 'about' }, { state: 'extra' });
      expect(mockHistory.pushState).toHaveBeenCalledWith('extra', '', '/about');
    });

    it('resolves after the destination handler has run', async () => {
      const data = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
      });
      const router = createRouter({
        routes: {
          home: { path: '/' },
          page: { data, path: '/page' },
        },
      });

      mockLocation.pathname = '/';
      await boot(router);

      let settled = false;
      const promise = router.navigate({ name: 'page' }).then(() => {
        settled = true;
      });

      expect(settled).toBe(false);
      await promise;
      expect(settled).toBe(true);
    });

    it('strips the base prefix when matching routes', async () => {
      const data = vi.fn();
      const router = createRouter({
        base: '/app',
        routes: {
          about: { data, path: '/about' },
        },
      });

      mockLocation.pathname = '/app/about';
      await boot(router);

      expect(data).toHaveBeenCalled();
    });

    it('does not strip sibling prefixes when base paths only partially overlap', async () => {
      const data = vi.fn();
      const router = createRouter({
        base: '/app',
        routes: {
          apple: { data, path: '/apple' },
        },
      });

      mockLocation.pathname = '/apple';
      await boot(router);

      expect(data).toHaveBeenCalled();
    });

    it('does not push a new history entry for the current named route URL', async () => {
      const data = vi.fn();
      const router = createRouter({
        routes: {
          about: { data, path: '/about' },
        },
      });

      mockLocation.pathname = '/about';
      await boot(router);

      mockHistory.pushState.mockClear();
      await router.navigate({ name: 'about' });

      expect(mockHistory.pushState).not.toHaveBeenCalled();
    });

    it('deduplicates identical query strings on named navigation', async () => {
      const data = vi.fn();
      const router = createRouter({
        routes: {
          search: { data, path: '/search' },
        },
      });

      mockLocation.pathname = '/search';
      mockLocation.search = '?q=test';
      await boot(router);

      mockHistory.pushState.mockClear();
      await router.navigate({ name: 'search', query: { q: 'test' } });

      expect(mockHistory.pushState).not.toHaveBeenCalled();
    });

    it('{ force: true } bypasses deduplication', async () => {
      const data = vi.fn();
      const router = createRouter({
        routes: {
          about: { data, path: '/about' },
        },
      });

      mockLocation.pathname = '/about';
      await boot(router);

      data.mockClear();
      await router.navigate({ name: 'about' }, { force: true });
      expect(data).toHaveBeenCalled();
    });

    it('updates dedup state after popstate navigation', async () => {
      const data = vi.fn();
      const router = createRouter({
        routes: {
          about: { data, path: '/about' },
          home: { path: '/' },
        },
      });

      mockLocation.pathname = '/about';
      await boot(router);

      mockLocation.pathname = '/';
      window.dispatchEvent(new Event('popstate'));
      await new Promise<void>((resolve) => setTimeout(resolve, 10));

      data.mockClear();
      mockHistory.pushState.mockClear();
      await router.navigate({ name: 'about' });

      expect(mockHistory.pushState).toHaveBeenCalledWith(undefined, '', '/about');
      expect(data).toHaveBeenCalledTimes(1);
    });

    it('supports raw path targets via navigate({ path })', async () => {
      const target = vi.fn();
      const router = createRouter({
        routes: {
          target: { data: target, path: '/target' },
        },
      });

      mockLocation.pathname = '/';
      await boot(router);

      await router.navigate({ path: '/target' });
      await router.navigate({ path: '/target?mode=edit' }, { replace: true });

      expect(mockHistory.pushState).toHaveBeenCalledWith(undefined, '', '/target');
      expect(mockHistory.replaceState).toHaveBeenCalledWith(undefined, '', '/target?mode=edit');
      expect(target).toHaveBeenCalledTimes(2);
    });

    it('does not duplicate the base segment when navigating with a base-prefixed raw path', async () => {
      const data = vi.fn();
      const router = createRouter({
        base: '/app',
        routes: {
          about: { data, path: '/about' },
        },
      });

      mockLocation.pathname = '/app';
      await boot(router);

      await router.navigate({ path: '/app/about' });

      expect(mockHistory.pushState).toHaveBeenCalledWith(undefined, '', '/app/about');
      expect(data).toHaveBeenCalledTimes(1);
    });
  });

  describe('Lifecycle', () => {
    it('constructor triggers the initial route match', async () => {
      const data = vi.fn();

      mockLocation.pathname = '/';
      await boot(
        createRouter({
          routes: {
            home: { data, path: '/' },
          },
        }),
      );

      expect(data).toHaveBeenCalled();
    });

    it('dispose() is idempotent and blocks later use', async () => {
      const router = createRouter({
        routes: {
          home: { data: vi.fn(), path: '/' },
        },
      });

      mockLocation.pathname = '/';
      await boot(router);

      router.dispose();
      router.dispose();

      expect(() => router.subscribe(vi.fn())).toThrow('[wayfinder] Router is disposed');
      await expect(router.navigate({ name: 'home' })).rejects.toThrow('[wayfinder] Router is disposed');
    });
  });

  describe('State & subscribers', () => {
    it('stores route state snapshots', async () => {
      const router = createRouter({
        routes: {
          userDetail: { meta: { foo: 'bar' }, path: '/items/:id' },
        },
      });

      mockLocation.pathname = '/items/42';
      mockLocation.search = '?q=test';
      await boot(router);

      expect(router.getSnapshot()).toEqual(
        expect.objectContaining({
          location: {
            hash: '',
            historyState: null,
            pathname: '/items/42',
            query: { q: 'test' },
          },
          status: 'idle',
        }),
      );
      expect(router.getSnapshot().matches.at(-1)).toEqual(
        expect.objectContaining({
          meta: { foo: 'bar' },
          name: 'userDetail',
          params: { id: '42' },
          pathname: '/items/42',
        }),
      );
    });

    it('subscribe() does not fire immediately; fires on subsequent navigations', async () => {
      const listener = vi.fn();
      const router = createRouter({
        routes: {
          about: { path: '/about' },
          home: { path: '/' },
        },
      });

      mockLocation.pathname = '/';
      await boot(router);

      expect(router.getSnapshot().location.pathname).toBe('/');

      router.subscribe(listener);
      await router.navigate({ name: 'about' });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0]?.[0].location.pathname).toBe('/about');
    });
  });

  describe('Helpers', () => {
    it('builds URLs and reports active routes by name', async () => {
      const router = createRouter({ routes });

      mockLocation.pathname = '/users/42';
      await boot(router);

      expect(router.url('userDetail', { id: '42' }, { tab: 'profile' })).toBe('/users/42?tab=profile');
      expect(router.isActive('userDetail')).toBe(true);
      expect(router.isActive('users')).toBe(true);
      expect(router.isActive('users', { exact: true })).toBe(false);
      expect(router.isActive('home')).toBe(false);
    });

    it('resolves full pathnames back to the matched branch', () => {
      const router = createRouter({
        base: '/app',
        routes: {
          dashboard: {
            children: {
              settings: { meta: { section: 'settings' }, path: 'settings' },
            },
            path: '/dashboard',
          },
        },
      });

      expect(router.resolve('/app/dashboard/settings')).toEqual([
        {
          component: undefined,
          data: undefined,
          meta: undefined,
          name: 'dashboard',
          params: {},
          pathname: '/dashboard/settings',
          status: 'idle',
        },
        {
          component: undefined,
          data: undefined,
          meta: { section: 'settings' },
          name: 'dashboard.settings',
          params: {},
          pathname: '/dashboard/settings',
          status: 'idle',
        },
      ]);
      expect(router.resolve('/app/missing')).toBeNull();
    });

    it('returns null from resolve for redirect routes', () => {
      const router = createRouter({
        routes: {
          current: { path: '/current' },
          legacy: { path: '/legacy', redirect: { name: 'current' } },
        },
      });

      expect(router.resolve('/legacy')).toBeNull();
      expect(router.resolve('/current')).toEqual([
        {
          component: undefined,
          data: undefined,
          meta: undefined,
          name: 'current',
          params: {},
          pathname: '/current',
          status: 'idle',
        },
      ]);
    });

    it('throws helpful errors for unknown route names', () => {
      const router = createRouter({
        routes: {
          about: { path: '/about' },
          home: { path: '/' },
        },
      });

      expect(() => router.url('missing' as never)).toThrow(
        '[wayfinder] Unknown route name: missing. Available routes: about, home',
      );
    });
  });

  describe('Concurrency', () => {
    it('a superseded navigation does not update router state', async () => {
      const history = createMemoryHistory('/');
      const router = createRouter({
        history,
        routes: {
          fast: { path: '/fast' },
          home: { path: '/' },
          slow: {
            data: () => new Promise<void>((r) => setTimeout(r, 30)),
            path: '/slow',
          },
        },
      });

      await settle();

      // Start slow navigation, immediately navigate away before data resolves.
      const slowNav = router.navigate({ path: '/slow' });

      await router.navigate({ path: '/fast' });
      await slowNav;

      expect(router.getSnapshot().location.pathname).toBe('/fast');
      router.dispose();
    });

    it('aborts data loader signal when a navigation is superseded', async () => {
      let firstSignal: AbortSignal | undefined;
      const { promise: slowGate, resolve: releaseSlow } = createDeferred<void>();
      const history = createMemoryHistory('/');
      const router = createRouter({
        history,
        routes: {
          fast: { path: '/fast' },
          slow: {
            data: async ({ signal }) => {
              firstSignal = signal;
              await slowGate;

              return null;
            },
            path: '/slow',
          },
        },
      });

      await settle();

      const slowNav = router.navigate({ path: '/slow' });

      await settle();
      await router.navigate({ path: '/fast' });

      releaseSlow();
      await slowNav;

      expect(firstSignal?.aborted).toBe(true);
      expect(router.getSnapshot().location.pathname).toBe('/fast');
      router.dispose();
    });
  });
});

describe('data error propagation', () => {
  it('a throwing data fn propagates the error to the navigate() caller', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        bad: {
          data: () => {
            throw new Error('handler boom');
          },
          path: '/bad',
        },
        home: { path: '/' },
      },
    });

    await settle();
    await expect(router.navigate({ path: '/bad' })).rejects.toThrow('handler boom');
    router.dispose();
  });
});

import { createRouter } from '../router';
import { boot, disposeRouter, mockHistory, mockLocation, resetMocks } from './setup';

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
          about: { handler: vi.fn(), path: '/about' },
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
          about: { handler: vi.fn(), path: '/about' },
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
          about: { handler: vi.fn(), path: '/about' },
        },
      });

      mockLocation.pathname = '/';
      await boot(router);

      await router.navigate({ name: 'about' }, { state: 'extra' });
      expect(mockHistory.pushState).toHaveBeenCalledWith('extra', '', '/about');
    });

    it('resolves after the destination handler has run', async () => {
      const handler = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
      });
      const router = createRouter({
        routes: {
          home: { path: '/' },
          page: { handler, path: '/page' },
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
      const handler = vi.fn();
      const router = createRouter({
        base: '/app',
        routes: {
          about: { handler, path: '/about' },
        },
      });

      mockLocation.pathname = '/app/about';
      await boot(router);

      expect(handler).toHaveBeenCalled();
    });

    it('does not strip sibling prefixes when base paths only partially overlap', async () => {
      const handler = vi.fn();
      const router = createRouter({
        base: '/app',
        routes: {
          apple: { handler, path: '/apple' },
        },
      });

      mockLocation.pathname = '/apple';
      await boot(router);

      expect(handler).toHaveBeenCalled();
    });

    it('does not push a new history entry for the current named route URL', async () => {
      const handler = vi.fn();
      const router = createRouter({
        routes: {
          about: { handler, path: '/about' },
        },
      });

      mockLocation.pathname = '/about';
      await boot(router);

      mockHistory.pushState.mockClear();
      await router.navigate({ name: 'about' });

      expect(mockHistory.pushState).not.toHaveBeenCalled();
    });

    it('deduplicates identical query strings on named navigation', async () => {
      const handler = vi.fn();
      const router = createRouter({
        routes: {
          search: { handler, path: '/search' },
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
      const handler = vi.fn();
      const router = createRouter({
        routes: {
          about: { handler, path: '/about' },
        },
      });

      mockLocation.pathname = '/about';
      await boot(router);

      handler.mockClear();
      await router.navigate({ name: 'about' }, { force: true });
      expect(handler).toHaveBeenCalled();
    });

    it('updates dedup state after popstate navigation', async () => {
      const handler = vi.fn();
      const router = createRouter({
        routes: {
          about: { handler, path: '/about' },
          home: { path: '/' },
        },
      });

      mockLocation.pathname = '/about';
      await boot(router);

      mockLocation.pathname = '/';
      window.dispatchEvent(new Event('popstate'));
      await new Promise<void>((resolve) => setTimeout(resolve, 10));

      handler.mockClear();
      mockHistory.pushState.mockClear();
      await router.navigate({ name: 'about' });

      expect(mockHistory.pushState).toHaveBeenCalledWith(undefined, '', '/about');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('supports raw path targets via navigate({ path })', async () => {
      const target = vi.fn();
      const router = createRouter({
        routes: {
          target: { handler: target, path: '/target' },
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
  });

  describe('Lifecycle', () => {
    it('constructor triggers the initial route match', async () => {
      const handler = vi.fn();

      mockLocation.pathname = '/';
      await boot(
        createRouter({
          routes: {
            home: { handler, path: '/' },
          },
        }),
      );

      expect(handler).toHaveBeenCalled();
    });

    it('dispose() is idempotent and blocks later use', async () => {
      const router = createRouter({
        routes: {
          home: { handler: vi.fn(), path: '/' },
        },
      });

      mockLocation.pathname = '/';
      await boot(router);

      router.dispose();
      router.dispose();

      expect(() => router.subscribe(vi.fn())).toThrow('[routeit] Router is disposed');
      await expect(router.navigate({ name: 'home' })).rejects.toThrow('[routeit] Router is disposed');
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

      expect(router.state).toEqual(
        expect.objectContaining({
          location: {
            hash: '',
            pathname: '/items/42',
            query: { q: 'test' },
          },
          status: 'idle',
        }),
      );
      expect(router.state.matches.at(-1)).toEqual(
        expect.objectContaining({
          meta: { foo: 'bar' },
          name: 'userDetail',
          params: { id: '42' },
          pathname: '/items/42',
        }),
      );
    });

    it('subscribe() fires immediately and on subsequent navigations', async () => {
      const listener = vi.fn();
      const router = createRouter({
        routes: {
          about: { path: '/about' },
          home: { path: '/' },
        },
      });

      mockLocation.pathname = '/';
      await boot(router);

      router.subscribe(listener);
      await router.navigate({ name: 'about' });

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener.mock.calls[0]?.[0].location.pathname).toBe('/');
      expect(listener.mock.calls[1]?.[0].location.pathname).toBe('/about');
    });
  });

  describe('Helpers', () => {
    it('builds URLs and reports active routes by name', async () => {
      const router = createRouter({ routes });

      mockLocation.pathname = '/users/42';
      await boot(router);

      expect(router.url('userDetail', { id: '42' }, { tab: 'profile' })).toBe('/users/42?tab=profile');
      expect(router.isActive('userDetail')).toBe(true);
      expect(router.isActive('users', false)).toBe(true);
      expect(router.isActive('home')).toBe(false);
    });

    it('resolves full pathnames back to the matched branch', () => {
      const router = createRouter({
        base: '/app',
        routes: {
          dashboard: {
            path: '/dashboard',
            children: {
              settings: { meta: { section: 'settings' }, path: 'settings' },
            },
          },
        },
      });

      expect(router.resolve('/app/dashboard/settings')).toEqual([
        {
          data: undefined,
          meta: undefined,
          name: 'dashboard',
          params: {},
          pathname: '/dashboard/settings',
        },
        {
          data: undefined,
          meta: { section: 'settings' },
          name: 'dashboard.settings',
          params: {},
          pathname: '/dashboard/settings',
        },
      ]);
      expect(router.resolve('/app/missing')).toBeNull();
    });

    it('throws helpful errors for unknown route names', () => {
      const router = createRouter({
        routes: {
          about: { path: '/about' },
          home: { path: '/' },
        },
      });

      expect(() => router.url('missing' as never)).toThrow(
        '[routeit] Unknown route name: missing. Available routes: about, home',
      );
    });
  });
});

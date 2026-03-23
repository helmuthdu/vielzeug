import { createRouter } from '../router';
import { boot, disposeRouter, resetMocks } from './setup';

describe('Navigation', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    disposeRouter();
  });

  describe('history navigation', () => {
    it('calls pushState with the target path', async () => {
      const handler = vi.fn();

      const router = createRouter();

      router.on('/about', handler);

      (globalThis as any).mockLocation.pathname = '/';
      await boot(router);

      await router.navigate('/about');
      expect((globalThis as any).mockHistory.pushState).toHaveBeenCalledWith(null, '', '/about');
    });

    it('{ replace: true } calls replaceState instead of pushState', async () => {
      const handler = vi.fn();

      const router = createRouter();

      router.on('/about', handler);

      (globalThis as any).mockLocation.pathname = '/';
      await boot(router);

      await router.navigate('/about', { replace: true });
      expect((globalThis as any).mockHistory.replaceState).toHaveBeenCalledWith(null, '', '/about');
    });

    it('{ state } option is forwarded to pushState', async () => {
      const handler = vi.fn();

      const router = createRouter();

      router.on('/about', handler);

      (globalThis as any).mockLocation.pathname = '/';
      await boot(router);

      await router.navigate('/about', { state: 'extra' });
      expect((globalThis as any).mockHistory.pushState).toHaveBeenCalledWith('extra', '', '/about');
    });

    it('returns a Promise that resolves after the handler has run', async () => {
      const handler = vi.fn(async () => {
        await new Promise((r) => setTimeout(r, 1));
      });

      const router = createRouter();

      router.on('/page', handler);

      (globalThis as any).mockLocation.pathname = '/';
      await boot(router);

      let settled = false;
      const promise = router.navigate('/page', { force: true }).then(() => {
        settled = true;
      });

      expect(settled).toBe(false);
      await promise;
      expect(settled).toBe(true);
    });

    it('strips the base prefix when matching routes', async () => {
      const handler = vi.fn();

      const router = createRouter({ base: '/app' });

      router.on('/about', handler);

      (globalThis as any).mockLocation.pathname = '/app/about';
      await boot(router);

      expect(handler).toHaveBeenCalled();
    });

    describe('same-URL deduplication', () => {
      it('does not push a new history entry when navigating to the current URL', async () => {
        const handler = vi.fn();

        const router = createRouter();

        router.on('/about', handler);

        (globalThis as any).mockLocation.pathname = '/about';
        await boot(router);

        (globalThis as any).mockHistory.pushState.mockClear();
        await router.navigate('/about');

        expect((globalThis as any).mockHistory.pushState).not.toHaveBeenCalled();
      });

      it('does not re-run for the same path with identical query string', async () => {
        const handler = vi.fn();

        const router = createRouter();

        router.on('/search', handler);

        (globalThis as any).mockLocation.pathname = '/search';
        (globalThis as any).mockLocation.search = '?q=test';
        await boot(router);

        (globalThis as any).mockHistory.pushState.mockClear();
        await router.navigate('/search?q=test');

        expect((globalThis as any).mockHistory.pushState).not.toHaveBeenCalled();
      });

      it('{ force: true } bypasses the deduplication check', async () => {
        const handler = vi.fn();

        const router = createRouter();

        router.on('/about', handler);

        (globalThis as any).mockLocation.pathname = '/about';
        await boot(router);

        handler.mockClear();
        await router.navigate('/about', { force: true });
        expect(handler).toHaveBeenCalled();
      });

      it('popstate resets the dedup state so the same URL can be navigated again', async () => {
        const handler = vi.fn();

        const router = createRouter();

        router.on('/about', handler);

        (globalThis as any).mockLocation.pathname = '/about';
        await boot(router);

        // Simulate browser back

        (globalThis as any).mockLocation.pathname = '/';
        window.dispatchEvent(new Event('popstate'));
        await new Promise<void>((r) => setTimeout(r, 10));

        handler.mockClear();
        (globalThis as any).mockHistory.pushState.mockClear();
        await router.navigate('/about');

        expect((globalThis as any).mockHistory.pushState).toHaveBeenCalledWith(null, '', '/about');
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Lifecycle', () => {
    it('start() triggers the initial route match', async () => {
      const handler = vi.fn();

      (globalThis as any).mockLocation.pathname = '/';
      await boot(createRouter().on('/', handler));
      expect(handler).toHaveBeenCalled();
    });

    it('start() is idempotent — handler runs exactly once even when called twice', async () => {
      const handler = vi.fn();

      const router = createRouter().on('/', handler);

      (globalThis as any).mockLocation.pathname = '/';
      await boot(router);
      router.start();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('stop() prevents popstate from triggering further route matching', async () => {
      const handler = vi.fn();
      const router = createRouter().on('/', handler);

      (globalThis as any).mockLocation.pathname = '/';
      await boot(router);

      router.stop();

      (globalThis as any).mockLocation.pathname = '/about';
      window.dispatchEvent(new Event('popstate'));

      await new Promise<void>((r) => setTimeout(r, 10));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('stop() is safe to call when the router was never started', () => {
      const router = createRouter();

      expect(() => router.stop()).not.toThrow();
    });

    it('autoStart: true starts the router without an explicit start() call', async () => {
      const handler = vi.fn();

      createRouter({ autoStart: true }).on('/', handler);

      (globalThis as any).mockLocation.pathname = '/';
      await new Promise<void>((r) => setTimeout(r, 20));

      expect(handler).toHaveBeenCalled();
    });

    it('autoStart: true — routes registered after createRouter() are all available', async () => {
      const handler = vi.fn();

      createRouter({ autoStart: true }).on('/', handler);

      (globalThis as any).mockLocation.pathname = '/';
      await new Promise<void>((r) => setTimeout(r, 20));

      expect(handler).toHaveBeenCalled();
    });

    it('autoStart + explicit start() still runs handler only once', async () => {
      const handler = vi.fn();
      const router = createRouter({ autoStart: true }).on('/', handler);

      (globalThis as any).mockLocation.pathname = '/';
      await new Promise<void>((r) => setTimeout(r, 20));
      router.start();

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('State & subscribers', () => {
    it('state reflects the current pathname, params and query', async () => {
      const router = createRouter();

      (globalThis as any).mockLocation.pathname = '/items/42';
      (globalThis as any).mockLocation.search = '?q=test';

      const instance = await boot(router.on('/items/:id', vi.fn()));

      expect(instance.state).toEqual(
        expect.objectContaining({
          params: { id: '42' },
          pathname: '/items/42',
          query: { q: 'test' },
        }),
      );
    });

    it('state.name is set for named routes', async () => {
      const router = createRouter();

      (globalThis as any).mockLocation.pathname = '/named';
      await boot(router.on('/named', vi.fn(), { name: 'named' }));

      expect(router.state.name).toBe('named');
    });

    it('state.meta reflects the matched route meta', async () => {
      const router = createRouter();

      (globalThis as any).mockLocation.pathname = '/meta';
      await boot(router.on('/meta', vi.fn(), { meta: { foo: 'bar' } }));

      expect(router.state.meta).toEqual({ foo: 'bar' });
    });

    it('state.meta is undefined when no route matches', async () => {
      const router = createRouter();

      (globalThis as any).mockLocation.pathname = '/nope';
      await boot(router.on('/other', vi.fn()));

      expect(router.state.meta).toBeUndefined();
    });

    it('subscribe() fires immediately with the current state', async () => {
      const handler = vi.fn();

      (globalThis as any).mockLocation.pathname = '/';
      await boot(createRouter().on('/', vi.fn()));

      createRouter().subscribe(handler);
      expect(handler).toHaveBeenCalled();
    });

    it('subscribe() notifies listener on subsequent navigations', async () => {
      const handler = vi.fn();

      const router = createRouter();

      router.on('/a', vi.fn());
      router.on('/b', vi.fn());

      (globalThis as any).mockLocation.pathname = '/a';
      await boot(router);

      router.subscribe(handler);
      await router.navigate('/b');

      expect(handler).toHaveBeenCalled();
    });

    it('subscribe() listener receives route name in state notification', async () => {
      const handler = vi.fn();

      const router = createRouter();

      router.on('/a', vi.fn(), { name: 'a' });

      (globalThis as any).mockLocation.pathname = '/a';
      await boot(router);

      router.subscribe(handler);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ name: 'a' }));
    });

    it('subscribe() listener receives meta in state notification', async () => {
      const handler = vi.fn();

      const router = createRouter();

      router.on('/a', vi.fn(), { meta: { foo: 'bar' } });

      (globalThis as any).mockLocation.pathname = '/a';
      await boot(router);

      router.subscribe(handler);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ meta: { foo: 'bar' } }));
    });

    it('unsubscribe() stops further listener notifications', async () => {
      const handler = vi.fn();

      const router = createRouter();

      router.on('/a', vi.fn());

      (globalThis as any).mockLocation.pathname = '/a';
      await boot(router);

      const unsubscribe = router.subscribe(handler);

      // subscribe() emits once immediately; we only assert no calls after unsubscribe.
      handler.mockClear();

      unsubscribe();
      await router.navigate('/a');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('isActive()', () => {
    it('returns true when the pattern matches the current path', async () => {
      const router = createRouter();

      router.on('/users/:id', vi.fn(), { name: 'userDetail' });

      (globalThis as any).mockLocation.pathname = '/users/42';
      await boot(router);

      expect(router.isActive('/users/:id')).toBe(true);
    });

    it('returns false when the pattern does not match', async () => {
      const router = createRouter();

      router.on('/users/:id', vi.fn(), { name: 'userDetail' });

      (globalThis as any).mockLocation.pathname = '/posts/1';
      await boot(router);

      expect(router.isActive('/users/:id')).toBe(false);
    });

    it('accepts a route name instead of a pattern', async () => {
      const router = createRouter();

      router.on('/users/:id', vi.fn(), { name: 'userDetail' });

      (globalThis as any).mockLocation.pathname = '/users/42';
      await boot(router);

      expect(router.isActive('userDetail')).toBe(true);
    });

    it('returns false for an inactive named route', async () => {
      const router = createRouter();

      router.on('/users/:id', vi.fn(), { name: 'userDetail' });

      (globalThis as any).mockLocation.pathname = '/posts/1';
      await boot(router);

      expect(router.isActive('userDetail')).toBe(false);
    });

    it('prefix matching matches when the current path starts with the pattern', async () => {
      const router = createRouter();

      router.on('/admin', vi.fn(), { name: 'admin' });

      (globalThis as any).mockLocation.pathname = '/admin/users';
      await boot(router);

      expect(router.isActive('/admin', false)).toBe(true);
    });

    it('prefix matching with a named route matches child paths', async () => {
      const router = createRouter();

      router.on('/admin', vi.fn(), { name: 'admin' });

      (globalThis as any).mockLocation.pathname = '/admin/users';
      await boot(router);

      expect(router.isActive('admin', false)).toBe(true);
    });

    it('prefix matching does NOT match a sibling path sharing only a text prefix', async () => {
      const router = createRouter();

      router.on('/admin', vi.fn());

      (globalThis as any).mockLocation.pathname = '/administrator';
      await boot(router);

      expect(router.isActive('/admin', false)).toBe(false);
    });

    it('default (exact: true) does not match a parent/prefix path', async () => {
      const router = createRouter();

      router.on('/admin', vi.fn());

      (globalThis as any).mockLocation.pathname = '/admin/users';
      await boot(router);

      expect(router.isActive('/admin')).toBe(false);
    });
  });

  describe('url()', () => {
    it('interpolates path parameters', () => {
      const router = createRouter();

      router.on('/users/:id', vi.fn(), { name: 'user' });

      expect(router.url('user', { id: '42' })).toBe('/users/42');
    });

    it('appends query parameters as a search string', () => {
      const router = createRouter();

      router.on('/q', vi.fn(), { name: 'q' });

      expect(router.url('q', {}, { a: '1', b: '2' })).toBe('/q?a=1&b=2');
    });

    it('appends array query parameters with repeated keys', () => {
      const router = createRouter();

      router.on('/arr', vi.fn(), { name: 'arr' });

      expect(router.url('arr', {}, { a: ['1', '2'] })).toBe('/arr?a=1&a=2');
    });

    it('builds URL for a named route', () => {
      const router = createRouter();

      router.on('/x', vi.fn(), { name: 'x' });

      expect(router.url('x')).toBe('/x');
    });

    it('includes the base path prefix', () => {
      const router = createRouter({ base: '/app' });

      router.on('/x', vi.fn(), { name: 'x' });

      expect(router.url('x')).toBe('/app/x');
    });

    it('throws for an unknown named route', () => {
      const router = createRouter();

      expect(() => router.url('missing')).toThrow();
    });

    it('throws when a required path parameter is missing', () => {
      const router = createRouter();

      router.on('/users/:id', vi.fn(), { name: 'user' });
      expect(() => router.url('user')).toThrow();
    });

    it('builds a wildcard param URL without encoding slashes', () => {
      const router = createRouter();

      router.on('/files/:rest*', vi.fn(), { name: 'files' });

      expect(router.url('files', { rest: 'a/b/c' })).toBe('/files/a/b/c');
    });
  });

  describe('resolve()', () => {
    it('returns name, params, and meta for a matching path', () => {
      const router = createRouter();

      router.on('/users/:id', vi.fn(), { meta: { foo: 'bar' }, name: 'user' });

      const resolved = router.resolve('/users/42');

      expect(resolved).toEqual({ meta: { foo: 'bar' }, name: 'user', params: { id: '42' } });
    });

    it('returns null when no route matches', () => {
      const router = createRouter();

      router.on('/users/:id', vi.fn(), { name: 'user' });

      expect(router.resolve('/nope')).toBeNull();
    });

    it('name and meta are undefined for routes registered without them', () => {
      const router = createRouter();

      router.on('/users/:id', vi.fn());

      const resolved = router.resolve('/users/42');

      expect(resolved).toEqual({ meta: undefined, name: undefined, params: { id: '42' } });
    });

    it('first registered route wins when multiple patterns match', () => {
      const router = createRouter();

      router.on('/a/:id', vi.fn(), { name: 'first' });
      router.on('/a/42', vi.fn(), { name: 'second' });

      const resolved = router.resolve('/a/42');

      expect(resolved?.name).toBe('first');
    });

    it('strips the base path so callers can pass window.location.pathname', () => {
      const router = createRouter({ base: '/app' });

      router.on('/about', vi.fn(), { name: 'about' });

      const resolved = router.resolve('/app/about');

      expect(resolved?.name).toBe('about');
    });

    it('does not trigger navigation or notify listeners', () => {
      const router = createRouter();

      router.on('/about', vi.fn());

      const spy = vi.fn();

      router.subscribe(spy);
      // subscribe() emits current state immediately; resolve() must not emit additional updates.
      spy.mockClear();

      router.resolve('/about');
      expect(spy).not.toHaveBeenCalled();
    });
  });
});

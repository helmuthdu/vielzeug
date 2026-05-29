/**
 * isActive() — URL matching against named routes.
 */
import { createMemoryHistory, createRouter } from '../';
import { boot, disposeRouter, mockLocation, resetMocks } from './setup';
import { settle } from './test-utils';

describe('isActive() — prefix matching (default)', () => {
  it('returns true when the current pathname matches the route prefix', async () => {
    const history = createMemoryHistory('/dashboard/settings');
    const router = createRouter({
      history,
      routes: {
        dashboard: {
          children: { settings: { path: 'settings' } },
          // Parent must have a handler/lazy/redirect to be registered as a named route.
          handler: vi.fn(),
          path: '/dashboard',
        },
      },
    });

    await settle();

    // /dashboard/settings satisfies the prefix pattern of /dashboard
    expect(router.isActive('dashboard')).toBe(true);
    router.dispose();
  });

  it('returns true for an exact pathname match with prefix mode', async () => {
    const history = createMemoryHistory('/about');
    const router = createRouter({
      history,
      routes: {
        about: { path: '/about' },
        home: { path: '/' },
      },
    });

    await settle();

    expect(router.isActive('about')).toBe(true);
    router.dispose();
  });

  it('returns false when the current path does not match the route', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        about: { path: '/about' },
        home: { path: '/' },
      },
    });

    await settle();

    expect(router.isActive('about')).toBe(false);
    router.dispose();
  });
});

describe('isActive() — exact matching', () => {
  it('returns true when the current pathname exactly matches the route', async () => {
    const history = createMemoryHistory('/about');
    const router = createRouter({
      history,
      routes: {
        about: { path: '/about' },
        home: { path: '/' },
      },
    });

    await settle();

    expect(router.isActive('about', { exact: true })).toBe(true);
    router.dispose();
  });

  it('returns false when the current pathname only matches the route as a prefix', async () => {
    const history = createMemoryHistory('/dashboard/settings');
    const router = createRouter({
      history,
      routes: {
        dashboard: {
          children: { settings: { path: 'settings' } },
          handler: vi.fn(),
          path: '/dashboard',
        },
      },
    });

    await settle();

    // /dashboard/settings does not exactly match /dashboard
    expect(router.isActive('dashboard', { exact: true })).toBe(false);
    router.dispose();
  });

  it('returns true for exact match on a leaf nested route', async () => {
    const history = createMemoryHistory('/dashboard/settings');
    const router = createRouter({
      history,
      routes: {
        dashboard: {
          children: { settings: { path: 'settings' } },
          handler: vi.fn(),
          path: '/dashboard',
        },
      },
    });

    await settle();

    expect(router.isActive('dashboard.settings', { exact: true })).toBe(true);
    router.dispose();
  });
});

describe('isActive() — base prefix stripping', () => {
  beforeEach(() => resetMocks());
  afterEach(() => disposeRouter());

  it('strips the router base before comparing', async () => {
    const router = createRouter({
      base: '/app',
      routes: {
        about: { path: '/about' },
        home: { path: '/' },
      },
    });

    mockLocation.pathname = '/app/about';
    await boot(router);

    expect(router.isActive('about')).toBe(true);
    expect(router.isActive('home')).toBe(false);
  });

  it('does not match a sibling base prefix', async () => {
    const router = createRouter({
      base: '/app',
      routes: {
        about: { path: '/about' },
      },
    });

    // /apple is not inside /app (the base strips /app, leaving /le)
    mockLocation.pathname = '/apple/about';
    await boot(router);

    expect(router.isActive('about')).toBe(false);
  });
});

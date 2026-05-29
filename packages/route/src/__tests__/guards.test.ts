/**
 * beforeLeave guards — navigation blocking and removal semantics.
 */
import { createMemoryHistory, createRouter } from '../';
import { mockHistory, mockLocation, resetMocks } from './setup';
import { settle } from './test-utils';

describe('beforeLeave', () => {
  beforeEach(() => {
    resetMocks();
  });
  it('allows navigation when the blocker returns true', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, page: { handler, path: '/page' } },
    });

    await settle();
    router.beforeLeave(async () => true);
    await router.navigate({ path: '/page' });

    expect(handler).toHaveBeenCalled();
    router.dispose();
  });

  it('blocks navigation when the blocker returns false', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, page: { handler, path: '/page' } },
    });

    await settle();
    router.beforeLeave(async () => false);
    await router.navigate({ path: '/page' });

    expect(handler).not.toHaveBeenCalled();
    expect(router.getSnapshot().location.pathname).toBe('/');
    router.dispose();
  });

  it('removing the guard re-allows navigation', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, page: { handler, path: '/page' } },
    });

    await settle();

    const remove = router.beforeLeave(async () => false);

    await router.navigate({ path: '/page' });
    expect(handler).not.toHaveBeenCalled();

    remove();
    await router.navigate({ path: '/page' });

    expect(handler).toHaveBeenCalledTimes(1);
    router.dispose();
  });

  it('blocker receives control before any state change', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, page: { path: '/page' } },
    });

    await settle();

    let pathnameAtBlockTime = '';

    router.beforeLeave(async () => {
      pathnameAtBlockTime = router.getSnapshot().location.pathname;

      return false;
    });

    await router.navigate({ path: '/page' });

    expect(pathnameAtBlockTime).toBe('/');
    router.dispose();
  });

  it('runs all registered blockers and blocks if any return false', async () => {
    const handler = vi.fn();
    const first = vi.fn(async () => true);
    const second = vi.fn(async () => false);
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, page: { handler, path: '/page' } },
    });

    await settle();
    router.beforeLeave(first);
    router.beforeLeave(second);
    await router.navigate({ path: '/page' });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();
    router.dispose();
  });

  it('uses a snapshot of blockers so removal during iteration does not skip entries', async () => {
    const second = vi.fn(async () => true);
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, page: { handler: vi.fn(), path: '/page' } },
    });

    await settle();

    const removeSecond = router.beforeLeave(second);

    // First blocker removes the second one during execution — second must still run.
    router.beforeLeave(async () => {
      removeSecond();

      return true;
    });

    await router.navigate({ path: '/page' });

    expect(second).toHaveBeenCalledTimes(1);
    router.dispose();
  });

  it('blocks popstate navigation and restores previous URL', async () => {
    const handler = vi.fn();
    const router = createRouter({
      routes: {
        home: { path: '/' },
        page: { handler, path: '/page' },
      },
    });

    mockLocation.pathname = '/';
    await settle();

    router.beforeLeave(async () => false);

    mockLocation.pathname = '/page';
    window.dispatchEvent(new Event('popstate'));

    await settle();

    expect(router.getSnapshot().location.pathname).toBe('/');
    expect(handler).not.toHaveBeenCalled();
    expect(mockHistory.replaceState).toHaveBeenCalledWith(null, '', '/');
    router.dispose();
  });
});

describe('per-route onLeave', () => {
  it('blocks navigation when the route onLeave returns false', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/home');
    const router = createRouter({
      history,
      routes: {
        home: { onLeave: async () => false, path: '/home' },
        page: { handler, path: '/page' },
      },
    });

    await settle();
    await router.navigate({ path: '/page' });

    expect(handler).not.toHaveBeenCalled();
    expect(router.getSnapshot().location.pathname).toBe('/home');
    router.dispose();
  });

  it('allows navigation when the route onLeave returns true', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/home');
    const router = createRouter({
      history,
      routes: {
        home: { onLeave: async () => true, path: '/home' },
        page: { handler, path: '/page' },
      },
    });

    await settle();
    await router.navigate({ path: '/page' });

    expect(handler).toHaveBeenCalledTimes(1);
    router.dispose();
  });

  it('per-route onLeave only fires when that route is currently matched', async () => {
    const onLeave = vi.fn(async () => false);
    const handler = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        other: { onLeave, path: '/other' },
        page: { handler, path: '/page' },
      },
    });

    await settle();

    // Navigate from / to /page — onLeave on /other should NOT fire.
    await router.navigate({ path: '/page' });

    expect(onLeave).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(1);
    router.dispose();
  });

  it('per-route onLeave fires before global beforeLeave', async () => {
    const order: string[] = [];
    const history = createMemoryHistory('/home');
    const router = createRouter({
      history,
      routes: {
        home: {
          onLeave: async () => {
            order.push('route');

            return true;
          },
          path: '/home',
        },
        other: { path: '/other' },
      },
    });

    await settle();
    router.beforeLeave(async () => {
      order.push('global');

      return true;
    });
    await router.navigate({ path: '/other' });

    expect(order).toEqual(['route', 'global']);
    router.dispose();
  });

  it('per-route onLeave fires leaf-to-root for nested routes', async () => {
    const order: string[] = [];
    const history = createMemoryHistory('/parent/child');
    const router = createRouter({
      history,
      routes: {
        other: { path: '/other' },
        parent: {
          children: {
            child: {
              onLeave: async () => {
                order.push('child');

                return true;
              },
              path: 'child',
            },
          },
          onLeave: async () => {
            order.push('parent');

            return true;
          },
          path: '/parent',
        },
      },
    });

    await settle();
    await router.navigate({ path: '/other' });

    expect(order).toEqual(['child', 'parent']); // leaf fires before root
    router.dispose();
  });
});

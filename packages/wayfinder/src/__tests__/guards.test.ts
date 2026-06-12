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
    const data = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, page: { data, path: '/page' } },
    });

    await settle();
    router.beforeLeave(async () => true);
    await router.navigate({ path: '/page' });

    expect(data).toHaveBeenCalled();
    router.dispose();
  });

  it('blocks navigation when the blocker returns false', async () => {
    const data = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, page: { data, path: '/page' } },
    });

    await settle();
    router.beforeLeave(async () => false);
    await router.navigate({ path: '/page' });

    expect(data).not.toHaveBeenCalled();
    expect(router.getSnapshot().location.pathname).toBe('/');
    router.dispose();
  });

  it('removing the guard re-allows navigation', async () => {
    const data = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, page: { data, path: '/page' } },
    });

    await settle();

    const remove = router.beforeLeave(async () => false);

    await router.navigate({ path: '/page' });
    expect(data).not.toHaveBeenCalled();

    remove();
    await router.navigate({ path: '/page' });

    expect(data).toHaveBeenCalledTimes(1);
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
    const data = vi.fn();
    const first = vi.fn(async () => true);
    const second = vi.fn(async () => false);
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, page: { data, path: '/page' } },
    });

    await settle();
    router.beforeLeave(first);
    router.beforeLeave(second);
    await router.navigate({ path: '/page' });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(data).not.toHaveBeenCalled();
    router.dispose();
  });

  it('uses a snapshot of blockers so removal during iteration does not skip entries', async () => {
    const second = vi.fn(async () => true);
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, page: { data: vi.fn(), path: '/page' } },
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
    const router = createRouter({
      routes: {
        home: { path: '/' },
        page: { path: '/page' },
      },
    });

    mockLocation.pathname = '/';
    await settle();

    router.beforeLeave(async () => false);

    mockLocation.pathname = '/page';
    window.dispatchEvent(new Event('popstate'));

    await settle();

    expect(router.getSnapshot().location.pathname).toBe('/');
    expect(mockHistory.replaceState).toHaveBeenCalledWith(null, '', '/');
    router.dispose();
  });
});

describe('NavigationDestination', () => {
  it('passes destination pathname, params, query, and name to the blocker', async () => {
    let captured: import('../').NavigationDestination | undefined;
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        userDetail: { path: '/users/:id' },
      },
    });

    await settle();
    router.beforeLeave(async (dest) => {
      captured = dest;

      return true;
    });
    await router.navigate({ name: 'userDetail', params: { id: '42' } });

    expect(captured).toMatchObject({
      name: 'userDetail',
      params: { id: '42' },
      pathname: '/users/42',
    });
    router.dispose();
  });

  it('passes destination params to blockers on popstate navigation', async () => {
    let captured: import('../').NavigationDestination | undefined;
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        userDetail: { path: '/users/:id' },
      },
    });

    await settle();
    router.beforeLeave(async (dest) => {
      captured = dest;

      return true;
    });

    history.push('/users/99');
    history.push('/somewhere');
    history.back(); // triggers history listener → navigates to /users/99
    await settle();

    expect(captured).toMatchObject({
      name: 'userDetail',
      params: { id: '99' },
      pathname: '/users/99',
    });
    router.dispose();
  });
});

describe('beforeLeave with route scope', () => {
  it('fires only when navigating away from the specified route', async () => {
    const blocker = vi.fn(async () => false);
    const data = vi.fn();
    const history = createMemoryHistory('/home');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/home' },
        other: { path: '/other' },
        page: { data, path: '/page' },
      },
    });

    await settle();
    router.beforeLeave(blocker, { routes: ['home'] });

    // Navigating away from /home — blocker should fire and block.
    await router.navigate({ path: '/page' });

    expect(blocker).toHaveBeenCalledTimes(1);
    expect(data).not.toHaveBeenCalled();
    expect(router.getSnapshot().location.pathname).toBe('/home');
    router.dispose();
  });

  it('does not fire when not on the specified route', async () => {
    const blocker = vi.fn(async () => false);
    const data = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        other: { path: '/other' },
        page: { data, path: '/page' },
      },
    });

    await settle();
    router.beforeLeave(blocker, { routes: ['other'] });

    // Currently on /, which is not 'other' — blocker should NOT fire.
    await router.navigate({ path: '/page' });

    expect(blocker).not.toHaveBeenCalled();
    expect(data).toHaveBeenCalledTimes(1);
    router.dispose();
  });

  it('route-scoped guard and global guard both run when applicable', async () => {
    const order: string[] = [];
    const history = createMemoryHistory('/home');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/home' },
        other: { path: '/other' },
      },
    });

    await settle();
    router.beforeLeave(
      async () => {
        order.push('scoped');

        return true;
      },
      { routes: ['home'] },
    );
    router.beforeLeave(async () => {
      order.push('global');

      return true;
    });
    await router.navigate({ path: '/other' });

    expect(order).toContain('scoped');
    expect(order).toContain('global');
    router.dispose();
  });
});

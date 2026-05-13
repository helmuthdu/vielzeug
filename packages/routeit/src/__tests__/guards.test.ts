/**
 * beforeLeave guards — navigation blocking and removal semantics.
 */
import { createMemoryHistory, createRouter } from '../router';
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
    expect(router.state.location.pathname).toBe('/');
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
      pathnameAtBlockTime = router.state.location.pathname;

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

    expect(router.state.location.pathname).toBe('/');
    expect(handler).not.toHaveBeenCalled();
    expect(mockHistory.replaceState).toHaveBeenCalledWith(null, '', '/');
    router.dispose();
  });
});

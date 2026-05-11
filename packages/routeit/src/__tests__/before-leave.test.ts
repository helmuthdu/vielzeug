import { createMemoryHistory, createRouter } from '../router';

async function settle(): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, 10));
}

describe('beforeLeave', () => {
  it('allows navigation when blocker returns true', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: { handler, path: '/page' },
      },
    });

    await settle();
    router.beforeLeave(async () => true);
    await router.navigate({ path: '/page' });

    expect(handler).toHaveBeenCalled();
    router.dispose();
  });

  it('blocks navigation when blocker returns false', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: { handler, path: '/page' },
      },
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
      routes: {
        home: { path: '/' },
        page: { handler, path: '/page' },
      },
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
      routes: {
        home: { path: '/' },
        page: { path: '/page' },
      },
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
});

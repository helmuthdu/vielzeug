import { createMemoryHistory, createRouter } from '../router';
import { settle } from './test-utils';

describe('toStore', () => {
  it('getSnapshot returns current router state', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({ history, routes: { home: { path: '/' } } });

    await settle();

    const { getSnapshot } = router.toStore();

    expect(getSnapshot()).toBe(router.state);

    router.dispose();
  });

  it('getSnapshot reflects route updates after navigation', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        about: { path: '/about' },
        home: { path: '/' },
      },
    });

    await settle();

    const { getSnapshot } = router.toStore();

    expect(getSnapshot().location.pathname).toBe('/');

    await router.navigate({ path: '/about' });

    expect(getSnapshot().location.pathname).toBe('/about');

    router.dispose();
  });

  it('subscribe does not emit an initial notification', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({ history, routes: { home: { path: '/' } } });

    await settle();

    const { subscribe } = router.toStore();
    const onStoreChange = vi.fn();

    const unsubscribe = subscribe(onStoreChange);

    expect(onStoreChange).not.toHaveBeenCalled();

    unsubscribe();
    router.dispose();
  });

  it('subscribe emits notifications for subsequent state changes', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        about: { path: '/about' },
        contact: { path: '/contact' },
        home: { path: '/' },
      },
    });

    await settle();

    const { subscribe } = router.toStore();
    const onStoreChange = vi.fn();

    const unsubscribe = subscribe(onStoreChange);

    await router.navigate({ path: '/about' });
    await router.navigate({ path: '/contact' });

    expect(onStoreChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    router.dispose();
  });

  it('unsubscribe stops further notifications', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        about: { path: '/about' },
        home: { path: '/' },
      },
    });

    await settle();

    const { subscribe } = router.toStore();
    const onStoreChange = vi.fn();

    const unsubscribe = subscribe(onStoreChange);

    await router.navigate({ path: '/about' });

    expect(onStoreChange).toHaveBeenCalledTimes(1);

    unsubscribe();

    await router.navigate({ path: '/' });

    expect(onStoreChange).toHaveBeenCalledTimes(1);

    router.dispose();
  });
});

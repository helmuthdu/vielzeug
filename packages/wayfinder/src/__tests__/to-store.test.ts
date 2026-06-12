import { createMemoryHistory, createRouter } from '../';
import { settle } from './test-utils';

describe('subscribe / getSnapshot', () => {
  it('getSnapshot returns current router state and updates on navigation', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        about: { path: '/about' },
        home: { path: '/' },
      },
    });

    await settle();

    const snapshot1 = router.getSnapshot();

    expect(snapshot1.location.pathname).toBe('/');

    await router.navigate({ path: '/about' });

    const snapshot2 = router.getSnapshot();

    expect(snapshot2.location.pathname).toBe('/about');
    expect(snapshot1).not.toBe(snapshot2); // new state is a different object

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

    expect(router.getSnapshot().location.pathname).toBe('/');

    await router.navigate({ path: '/about' });

    expect(router.getSnapshot().location.pathname).toBe('/about');

    router.dispose();
  });

  it('subscribe does not emit an initial notification', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({ history, routes: { home: { path: '/' } } });

    await settle();

    const onStoreChange = vi.fn();
    const unsubscribe = router.subscribe(onStoreChange);

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

    const onStoreChange = vi.fn();
    const unsubscribe = router.subscribe(onStoreChange);

    await router.navigate({ path: '/about' });
    await router.navigate({ path: '/contact' });

    expect(onStoreChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    router.dispose();
  });

  it('unsubscribing inside a notification callback does not crash', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        about: { path: '/about' },
        home: { path: '/' },
      },
    });

    await settle();

    let unsub: (() => void) | undefined;
    const calls: string[] = [];

    // eslint-disable-next-line prefer-const
    unsub = router.subscribe((state) => {
      calls.push(state.location.pathname);
      unsub?.();
    });

    await router.navigate({ path: '/about' });
    await router.navigate({ path: '/' });

    // Only the first notification should have fired; unsubscribe in it prevented the second.
    expect(calls).toEqual(['/about']);
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

    const onStoreChange = vi.fn();
    const unsubscribe = router.subscribe(onStoreChange);

    await router.navigate({ path: '/about' });

    expect(onStoreChange).toHaveBeenCalledTimes(1);

    unsubscribe();

    await router.navigate({ path: '/' });

    expect(onStoreChange).toHaveBeenCalledTimes(1);

    router.dispose();
  });
});

import { createMemoryHistory, createRouter, createRouteSignals } from '../';
import { settle } from './test-utils';

describe('createRouteSignals', () => {
  it('reflects the initial route on the name and params signals', async () => {
    const router = createRouter({
      history: createMemoryHistory('/users/42'),
      routes: { home: { path: '/' }, user: { path: '/users/:id' } },
    });

    await settle();

    const signals = createRouteSignals(router);

    expect(signals.name.value).toBe('user');
    expect(signals.params.value).toEqual({ id: '42' });

    router.dispose();
  });

  it('updates the name signal when the router navigates', async () => {
    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: { about: { path: '/about' }, home: { path: '/' } },
    });

    await settle();

    const signals = createRouteSignals(router);
    expect(signals.name.value).toBe('home');

    await router.navigate({ path: '/about' });

    expect(signals.name.value).toBe('about');

    router.dispose();
  });

  it('exposes the current location query on the query signal', async () => {
    const router = createRouter({
      history: createMemoryHistory('/search?page=2'),
      routes: { home: { path: '/' }, search: { path: '/search' } },
    });

    await settle();

    const signals = createRouteSignals(router);

    expect(signals.query.value).toEqual({ page: '2' });

    router.dispose();
  });

  it('re-evaluates a downstream computed on navigation', async () => {
    const { computed } = await import('@vielzeug/ripple');
    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: { about: { path: '/about' }, home: { path: '/' } },
    });

    await settle();

    const signals = createRouteSignals(router);
    const upper = computed(() => signals.name.value?.toUpperCase() ?? '');

    expect(upper.value).toBe('HOME');

    await router.navigate({ path: '/about' });

    expect(upper.value).toBe('ABOUT');

    router.dispose();
  });
});

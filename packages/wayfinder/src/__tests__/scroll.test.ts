import { createMemoryHistory, createRouter } from '../';

describe('scroll coordination', () => {
  it('applies the decision after navigation with previous and next state', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const scroll = vi.fn(() => ({ x: 10, y: 20 }) as const);
    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: { home: { path: '/' }, page: { path: '/page' } },
      scroll,
    });

    await router.ready;
    scroll.mockClear();
    await router.navigate({ name: 'page' });

    expect(scroll).toHaveBeenCalledWith(
      expect.objectContaining({ location: expect.objectContaining({ pathname: '/page' }) }),
      expect.objectContaining({ location: expect.objectContaining({ pathname: '/' }) }),
    );
    expect(scrollTo).toHaveBeenCalledWith(10, 20);
    scrollTo.mockRestore();
    router.dispose();
  });

  it('preserves scroll when requested', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: { home: { path: '/' }, page: { path: '/page' } },
      scroll: () => 'preserve',
    });

    await router.ready;
    scrollTo.mockClear();
    await router.navigate({ name: 'page' });

    expect(scrollTo).not.toHaveBeenCalled();
    scrollTo.mockRestore();
    router.dispose();
  });

  it('settles the view swap and scroll inside the view transition, not after it', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const order: string[] = [];
    const original = (document as Document & { startViewTransition?: unknown }).startViewTransition;

    // A minimal stand-in for the browser API: `finished` resolves after the callback runs.
    // Listeners and scroll must fire while the callback is still open — the transition's
    // new-state capture covers both, and neither lands as an uncovered jump after the fade.
    (document as Document & { startViewTransition?: unknown }).startViewTransition = (
      callback: () => void | Promise<void>,
    ) => ({
      finished: (async () => {
        await callback();
        order.push('finished');
      })(),
    });

    try {
      const router = createRouter({
        history: createMemoryHistory('/'),
        routes: { home: { path: '/' }, page: { path: '/page' } },
        scroll: () => 'top',
        viewTransition: true,
      });
      router.subscribe(() => order.push('notified'));
      scrollTo.mockImplementation(() => order.push('scrolled'));

      await router.ready;
      order.length = 0;
      await router.navigate({ name: 'page' });

      expect(order.indexOf('notified')).toBeGreaterThanOrEqual(0);
      expect(order.indexOf('scrolled')).toBeGreaterThan(order.indexOf('notified'));
      expect(order.indexOf('finished')).toBeGreaterThan(order.indexOf('scrolled'));
      router.dispose();
    } finally {
      (document as Document & { startViewTransition?: unknown }).startViewTransition = original;
      scrollTo.mockRestore();
    }
  });
});

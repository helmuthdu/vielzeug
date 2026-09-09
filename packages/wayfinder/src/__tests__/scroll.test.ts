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
});

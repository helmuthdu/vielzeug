import { createMemoryHistory, createRouter } from '../router';

async function settle(): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, 10));
}

describe('scroll restoration', () => {
  it('calls scroll callback after navigation', async () => {
    const scroll = vi.fn(() => null);
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: { handler: vi.fn(), path: '/page' },
      },
      scroll,
    });

    await settle();
    await router.navigate({ path: '/page' });

    expect(scroll).toHaveBeenCalled();
    router.dispose();
  });

  it('calls window.scrollTo(0,0) when scroll returns null', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, page: { path: '/page' } },
      scroll: () => null,
    });

    await settle();
    await router.navigate({ path: '/page' });

    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    scrollToSpy.mockRestore();
    router.dispose();
  });

  it('calls window.scrollTo with returned coordinates', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, page: { path: '/page' } },
      scroll: () => ({ x: 0, y: 300 }),
    });

    await settle();
    await router.navigate({ path: '/page' });

    expect(scrollToSpy).toHaveBeenCalledWith(0, 300);
    scrollToSpy.mockRestore();
    router.dispose();
  });

  it('receives to and from states in the scroll callback', async () => {
    const scroll = vi.fn(() => null);
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, page: { path: '/page' } },
      scroll,
    });

    await settle();

    await router.navigate({ path: '/page' });

    const [to, from] = scroll.mock.calls.at(-1)!;

    expect(to.location.pathname).toBe('/page');
    expect(from?.location.pathname).toBe('/');
    router.dispose();
  });
});

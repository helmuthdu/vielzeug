import { createMemoryHistory, createRouter } from '../router';

async function settle(): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, 10));
}

describe('preload', () => {
  it('calls data loaders without navigating', async () => {
    const dataFn = vi.fn(async () => ({ prefetched: true }));
    const handler = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: { data: dataFn, handler, path: '/page' },
      },
    });

    await settle();
    await router.preload('page');

    expect(dataFn).toHaveBeenCalledTimes(1);
    // handler must NOT have been called – we didn't navigate
    expect(handler).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe('/');
    router.dispose();
  });

  it('deduplicates concurrent preload calls for the same route', async () => {
    const dataFn = vi.fn(async () => null);
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: { data: dataFn, path: '/page' },
      },
    });

    await settle();
    await Promise.all([router.preload('page'), router.preload('page'), router.preload('page')]);

    expect(dataFn).toHaveBeenCalledTimes(1);
    router.dispose();
  });

  it('passes route params to the data loader', async () => {
    const dataFn = vi.fn(async () => null);
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        user: { data: dataFn, path: '/users/:id' },
      },
    });

    await settle();
    await router.preload('user', { id: '99' } as never);

    expect(dataFn).toHaveBeenCalledWith(expect.objectContaining({ params: { id: '99' } }));
    router.dispose();
  });
});

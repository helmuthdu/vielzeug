import { createMemoryHistory, createRouter } from '../router';

async function settle(): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, 10));
}

describe('lazy routes', () => {
  it('loads handler from lazy module on first navigation', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/page');
    const router = createRouter({
      history,
      routes: {
        page: {
          lazy: async () => ({ handler }),
          path: '/page',
        },
      },
    });

    await settle();
    expect(handler).toHaveBeenCalledTimes(1);
    router.dispose();
  });

  it('loads data function from lazy module', async () => {
    const dataFn = vi.fn(async () => ({ loaded: true }));
    const handler = vi.fn();
    const history = createMemoryHistory('/page');
    const router = createRouter({
      history,
      routes: {
        page: {
          lazy: async () => ({ data: dataFn, handler }),
          path: '/page',
        },
      },
    });

    await settle();
    expect(dataFn).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ data: { loaded: true } }));
    router.dispose();
  });

  it('only calls the lazy factory once across multiple navigations', async () => {
    const factory = vi.fn(async () => ({ handler: vi.fn() }));
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: { lazy: factory, path: '/page' },
      },
    });

    await settle();
    await router.navigate({ path: '/page' });
    await router.navigate({ path: '/' });
    await router.navigate({ path: '/page' });

    expect(factory).toHaveBeenCalledTimes(1);
    router.dispose();
  });

  it('lazy meta is picked up in router.state.matches', async () => {
    const history = createMemoryHistory('/page');
    const router = createRouter({
      history,
      routes: {
        page: {
          lazy: async () => ({ meta: { title: 'Lazy Page' } }),
          path: '/page',
        },
      },
    });

    await settle();
    expect(router.state.matches.at(-1)?.meta).toEqual({ title: 'Lazy Page' });
    router.dispose();
  });
});

import { createMemoryHistory, createRouter } from '../router';

async function settle(): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, 10));
}

describe('error in state', () => {
  it('sets status to error and exposes the thrown error on router.state.error', async () => {
    const thrown = new Error('data error');
    const boundary = vi.fn(async (_ctx: unknown, next: () => Promise<void>) => {
      try {
        await next();
      } catch {
        /* swallow */
      }
    });
    const history = createMemoryHistory('/fail');
    const router = createRouter({
      history,
      middleware: [boundary],
      routes: {
        fail: {
          data: async () => {
            throw thrown;
          },
          path: '/fail',
        },
      },
    });

    await settle();

    expect(router.state.status).toBe('error');
    expect(router.state.error).toBe(thrown);
    router.dispose();
  });

  it('clears error on the next successful navigation', async () => {
    const thrown = new Error('boom');
    const boundary = vi.fn(async (_ctx: unknown, next: () => Promise<void>) => {
      try {
        await next();
      } catch {
        /* swallow */
      }
    });
    const history = createMemoryHistory('/fail');
    const router = createRouter({
      history,
      middleware: [boundary],
      routes: {
        fail: {
          data: async () => {
            throw thrown;
          },
          path: '/fail',
        },
        ok: { handler: vi.fn(), path: '/ok' },
      },
    });

    await settle();
    expect(router.state.status).toBe('error');

    await router.navigate({ path: '/ok' });
    expect(router.state.status).toBe('idle');
    expect(router.state.error).toBeUndefined();
    router.dispose();
  });
});

describe('historyState in location', () => {
  it('exposes history entry state on router.state.location.historyState', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { handler: vi.fn(), path: '/' }, page: { handler: vi.fn(), path: '/page' } },
    });

    await settle();
    await router.navigate({ path: '/page' }, { state: { from: 'home' } });

    expect(router.state.location.historyState).toEqual({ from: 'home' });
    router.dispose();
  });

  it('historyState in ctx matches location state', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, page: { handler, path: '/page' } },
    });

    await settle();
    await router.navigate({ path: '/page' }, { state: { extra: 42 } });

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ historyState: { extra: 42 } }));
    router.dispose();
  });
});

describe('onError callback', () => {
  it('reports initial navigation errors through onError', async () => {
    const onError = vi.fn();
    const history = createMemoryHistory('/fail');
    const router = createRouter({
      history,
      onError,
      routes: {
        fail: {
          data: async () => {
            throw new Error('boom');
          },
          path: '/fail',
        },
      },
    });

    await settle();

    expect(onError).toHaveBeenCalledWith(expect.any(Error), { source: 'initial-navigation' });
    router.dispose();
  });

  it('reports preload failures through onError', async () => {
    const onError = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      onError,
      routes: {
        fail: {
          data: async () => {
            throw new Error('prefetch fail');
          },
          path: '/fail',
        },
        home: { path: '/' },
      },
    });

    await settle();

    await expect(router.preload('fail')).rejects.toThrow('prefetch fail');
    expect(onError).toHaveBeenCalledWith(expect.any(Error), { source: 'preload' });
    router.dispose();
  });
});

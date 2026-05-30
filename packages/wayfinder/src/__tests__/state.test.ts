/**
 * Router state — error status, historyState in location, and error reporting
 * via the onError callback.
 */
import { createMemoryHistory, createRouter } from '../';
import { settle } from './test-utils';

/** Global error boundary that swallows exceptions so the router settles. */
const swallow = vi.fn(async (_ctx: unknown, next: () => Promise<void>) => {
  try {
    await next();
  } catch {
    /* swallow */
  }
});

describe('error status', () => {
  beforeEach(() => swallow.mockClear());

  it('sets status to error and exposes the thrown value when a data function throws', async () => {
    const thrown = new Error('data error');
    const history = createMemoryHistory('/fail');
    const router = createRouter({
      history,
      middleware: [swallow],
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

    expect(router.getSnapshot().status).toBe('error');
    expect(router.getSnapshot().error).toBe(thrown);
    router.dispose();
  });

  it('clears status and error on the next successful navigation', async () => {
    const history = createMemoryHistory('/fail');
    const router = createRouter({
      history,
      middleware: [swallow],
      routes: {
        fail: {
          data: async () => {
            throw new Error('boom');
          },
          path: '/fail',
        },
        ok: { handler: vi.fn(), path: '/ok' },
      },
    });

    await settle();
    expect(router.getSnapshot().status).toBe('error');

    await router.navigate({ path: '/ok' });

    expect(router.getSnapshot().status).toBe('idle');
    expect(router.getSnapshot().error).toBeUndefined();
    router.dispose();
  });
});

describe('historyState in location', () => {
  it('exposes history entry state on router.getSnapshot().location.historyState', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' }, page: { path: '/page' } },
    });

    await settle();
    await router.navigate({ path: '/page' }, { state: { from: 'home' } });

    expect(router.getSnapshot().location.historyState).toEqual({ from: 'home' });
    router.dispose();
  });

  it('historyState in ctx matches the location state', async () => {
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
  it('receives initial-navigation errors with the correct source', async () => {
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

  it('receives history-listener navigation errors with the correct source', async () => {
    const onError = vi.fn();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      onError,
      routes: {
        fail: {
          data: async () => {
            throw new Error('listener fail');
          },
          path: '/fail',
        },
        home: { path: '/' },
      },
    });

    await settle();
    // push is silent; use back() to trigger a history-listener navigation
    history.push('/fail'); // silent: stack [/, /fail], cursor=1
    history.push('/home2'); // silent: stack [/, /fail, /home2], cursor=2
    history.back(); // triggers listener → navigates to /fail
    await settle();

    expect(onError).toHaveBeenCalledWith(expect.any(Error), { source: 'history-listener' });
    router.dispose();
  });

  it('receives preload errors with the correct source', async () => {
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

describe('subscriber notification count', () => {
  it('notifies subscribers exactly twice (loading then error) when a data loader throws', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      middleware: [swallow],
      routes: {
        home: {
          data: async () => {
            throw new Error('boom');
          },
          path: '/',
        },
      },
    });
    const statuses: string[] = [];

    router.subscribe((s) => statuses.push(s.status));

    await settle();

    expect(statuses).toEqual(['loading', 'error']);
    router.dispose();
  });
});

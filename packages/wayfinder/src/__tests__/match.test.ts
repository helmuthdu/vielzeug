/**
 * match() — SSR URL resolution without side effects.
 */
import { createMemoryHistory, createRouter } from '../';
import { settle } from './test-utils';

describe('match()', () => {
  it('returns matched route state for a URL without modifying router state', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        about: { path: '/about' },
        home: { path: '/' },
      },
    });

    await settle();

    const state = await router.match('/about');

    expect(state).not.toBeNull();
    expect(state?.location.pathname).toBe('/about');
    // Router state must remain at original path.
    expect(router.getSnapshot().location.pathname).toBe('/');
    router.dispose();
  });

  it('returns null for unmatched URLs', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: { home: { path: '/' } },
    });

    await settle();

    const state = await router.match('/does-not-exist');

    expect(state).toBeNull();
    router.dispose();
  });

  it('follows declarative redirects without navigating', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        new: { path: '/new' },
        old: { path: '/old', redirect: { path: '/new' } },
      },
    });

    await settle();

    const state = await router.match('/old');

    // match() follows the redirect transparently.
    expect(state?.location.pathname).toBe('/new');
    expect(router.getSnapshot().location.pathname).toBe('/');
    router.dispose();
  });

  it('runs data loaders and includes results in matched state', async () => {
    const dataFn = vi.fn(async () => ({ ssr: true }));
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: { data: dataFn, path: '/page' },
      },
    });

    await settle();

    const state = await router.match('/page');

    expect(dataFn).toHaveBeenCalledTimes(1);
    expect(state?.matches.at(-1)?.data).toEqual({ ssr: true });
    // Router navigation state should be unaffected.
    expect(router.getSnapshot().location.pathname).toBe('/');
    router.dispose();
  });

  it('does not modify history', async () => {
    const history = createMemoryHistory('/');
    const pushSpy = vi.spyOn(history, 'push');
    const replaceSpy = vi.spyOn(history, 'replace');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: { path: '/page' },
      },
    });

    await settle();
    await router.match('/page');

    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
    router.dispose();
  });

  it('returns error status when data loader throws', async () => {
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        broken: {
          data: async () => {
            throw new Error('load failed');
          },
          path: '/broken',
        },
        home: { path: '/' },
      },
    });

    await settle();

    const state = await router.match('/broken');

    expect(state?.status).toBe('error');
    expect((state?.error as Error).message).toBe('load failed');
    router.dispose();
  });

  it('respects the base option when resolving URLs', async () => {
    const history = createMemoryHistory('/app/');
    const router = createRouter({
      base: '/app',
      history,
      routes: { home: { path: '/' }, page: { path: '/page' } },
    });

    await settle();

    const state = await router.match('/app/page');

    expect(state?.location.pathname).toBe('/page');
    expect(router.getSnapshot().location.pathname).toBe('/');
    router.dispose();
  });

  it('forwards the provided signal to the data loader', async () => {
    let capturedSignal: AbortSignal | undefined;
    const controller = new AbortController();
    const history = createMemoryHistory('/');
    const router = createRouter({
      history,
      routes: {
        home: { path: '/' },
        page: {
          data: async ({ signal }: { signal: AbortSignal }) => {
            capturedSignal = signal;

            return { ok: true };
          },
          path: '/page',
        },
      },
    });

    await settle();

    controller.abort();
    await router.match('/page', { signal: controller.signal });

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(true);
    router.dispose();
  });
});

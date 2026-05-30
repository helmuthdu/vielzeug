/**
 * redirectTo() — middleware helper for programmatic navigation.
 */
import { createMemoryHistory, createRouter, redirectTo } from '../';
import { settle } from './test-utils';

describe('redirectTo()', () => {
  it('redirects to a raw path target', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/old');
    const router = createRouter({
      history,
      routes: {
        new: { handler, path: '/new' },
        old: { middleware: [redirectTo({ path: '/new' })], path: '/old' },
      },
    });

    await settle();

    expect(handler).toHaveBeenCalled();
    expect(router.getSnapshot().location.pathname).toBe('/new');
    router.dispose();
  });

  it('redirects to a named route target', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/old');
    const router = createRouter({
      history,
      routes: {
        new: { handler, path: '/new' },
        old: { middleware: [redirectTo({ name: 'new' })], path: '/old' },
      },
    });

    await settle();

    expect(handler).toHaveBeenCalled();
    expect(router.getSnapshot().location.pathname).toBe('/new');
    router.dispose();
  });

  it('uses { replace: true } to replace the history entry instead of pushing', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/old');
    const pushSpy = vi.spyOn(history, 'push');
    const replaceSpy = vi.spyOn(history, 'replace');
    const router = createRouter({
      history,
      routes: {
        new: { handler, path: '/new' },
        old: { middleware: [redirectTo({ path: '/new' }, { replace: true })], path: '/old' },
      },
    });

    await settle();

    expect(handler).toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalled();
    expect(pushSpy).not.toHaveBeenCalled();
    router.dispose();
  });

  it('does not navigate when the redirect target matches the current URL', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/home');
    const router = createRouter({
      history,
      routes: {
        home: { handler, path: '/home' },
      },
    });

    await settle();
    handler.mockClear();

    // /home → /home is a no-op (deduplication).
    await router.navigate({ name: 'home' });

    expect(handler).not.toHaveBeenCalled();
    router.dispose();
  });

  it('redirectTo in global middleware applies to all routes', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/protected');
    const router = createRouter({
      history,
      middleware: [
        async (ctx, next) => {
          if (ctx.pathname === '/protected') {
            await ctx.navigate({ path: '/login' });

            return;
          }

          await next();
        },
      ],
      routes: {
        login: { handler, path: '/login' },
        protected: { path: '/protected' },
      },
    });

    await settle();

    expect(handler).toHaveBeenCalled();
    expect(router.getSnapshot().location.pathname).toBe('/login');
    router.dispose();
  });
});

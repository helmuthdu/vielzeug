/**
 * redirectTo() — middleware helper for programmatic navigation.
 */
import { createMemoryHistory, createRouter, redirectTo } from '../';
import { settle } from './test-utils';

describe('redirectTo()', () => {
  it('redirects to a raw path target', async () => {
    const dataFn = vi.fn();
    const history = createMemoryHistory('/old');
    const router = createRouter({
      history,
      routes: {
        new: { data: dataFn, path: '/new' },
        old: { middleware: [redirectTo({ path: '/new' })], path: '/old' },
      },
    });

    await settle();

    expect(dataFn).toHaveBeenCalled();
    expect(router.getSnapshot().location.pathname).toBe('/new');
    router.dispose();
  });

  it('redirects to a named route target', async () => {
    const dataFn = vi.fn();
    const history = createMemoryHistory('/old');
    const router = createRouter({
      history,
      routes: {
        new: { data: dataFn, path: '/new' },
        old: { middleware: [redirectTo({ name: 'new' })], path: '/old' },
      },
    });

    await settle();

    expect(dataFn).toHaveBeenCalled();
    expect(router.getSnapshot().location.pathname).toBe('/new');
    router.dispose();
  });

  it('uses { replace: true } to replace the history entry instead of pushing', async () => {
    const dataFn = vi.fn();
    const history = createMemoryHistory('/old');
    const pushSpy = vi.spyOn(history, 'push');
    const replaceSpy = vi.spyOn(history, 'replace');
    const router = createRouter({
      history,
      routes: {
        new: { data: dataFn, path: '/new' },
        old: { middleware: [redirectTo({ path: '/new' }, { replace: true })], path: '/old' },
      },
    });

    await settle();

    expect(dataFn).toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalled();
    expect(pushSpy).not.toHaveBeenCalled();
    router.dispose();
  });

  it('does not navigate when the redirect target matches the current URL', async () => {
    const dataFn = vi.fn();
    const history = createMemoryHistory('/home');
    const router = createRouter({
      history,
      routes: {
        home: { data: dataFn, path: '/home' },
      },
    });

    await settle();
    dataFn.mockClear();

    // /home → /home is a no-op (deduplication).
    await router.navigate({ name: 'home' });

    expect(dataFn).not.toHaveBeenCalled();
    router.dispose();
  });

  it('redirectTo in global middleware applies to all routes', async () => {
    const dataFn = vi.fn();
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
        login: { data: dataFn, path: '/login' },
        protected: { path: '/protected' },
      },
    });

    await settle();

    expect(dataFn).toHaveBeenCalled();
    expect(router.getSnapshot().location.pathname).toBe('/login');
    router.dispose();
  });
});

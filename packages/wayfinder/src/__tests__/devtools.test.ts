/**
 * debugRouter() — /devtools navigation lifecycle logging.
 */
import { createMemoryHistory } from '../';
import { debugRouter } from '../devtools';
import { settle } from './test-utils';

describe('debugRouter', () => {
  it('creates a working router that navigates normally', async () => {
    const history = createMemoryHistory('/');
    const router = debugRouter({
      history,
      routes: {
        about: { path: '/about' },
        home: { path: '/' },
      },
    });

    await settle();
    await router.navigate({ path: '/about' });

    expect(router.getSnapshot().location.pathname).toBe('/about');
    router.dispose();
  });

  it('logs loading -> idle transitions to console.debug with the default [wayfinder:nav] prefix', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const history = createMemoryHistory('/');
    const dataFn = vi.fn(async () => ({ ok: true }));
    const router = debugRouter({
      history,
      routes: {
        home: { path: '/' },
        page: { data: dataFn, path: '/page' },
      },
    });

    await settle();
    debugSpy.mockClear();

    await router.navigate({ path: '/page' });

    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('[wayfinder:nav] loading'));
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('[wayfinder:nav] idle'));
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('[page]'));

    router.dispose();
    debugSpy.mockRestore();
  });

  it('uses a custom label to distinguish multiple routers', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const history = createMemoryHistory('/');
    const router = debugRouter({
      history,
      label: 'modal',
      routes: {
        confirm: { path: '/confirm' },
        home: { path: '/' },
      },
    });

    await settle();
    debugSpy.mockClear();

    await router.navigate({ path: '/confirm' });

    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('[wayfinder:modal]'));
    expect(debugSpy).not.toHaveBeenCalledWith(expect.stringContaining('[wayfinder:nav]'));

    router.dispose();
    debugSpy.mockRestore();
  });

  it('logs the error branch with the thrown error as the second console.debug argument', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const boom = new Error('data loader boom');
    const history = createMemoryHistory('/');
    const router = debugRouter({
      history,
      onError: vi.fn(),
      routes: {
        home: { path: '/' },
        page: {
          data: async () => {
            throw boom;
          },
          path: '/page',
        },
      },
    });

    await settle();
    debugSpy.mockClear();

    await router.navigate({ path: '/page' }).catch(() => undefined);

    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('[wayfinder:nav] error'), boom);

    router.dispose();
    debugSpy.mockRestore();
  });
});

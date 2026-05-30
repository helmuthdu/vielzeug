/**
 * coerceSearch — per-route query string coercion.
 */
import { createMemoryHistory, createRouter } from '../';
import { settle } from './test-utils';

describe('coerceSearch', () => {
  it('transforms raw query params when coerceSearch is provided', async () => {
    const handler = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/search?q=hello&page=2'),
      routes: {
        search: {
          coerceSearch: (raw) => ({ page: Number(raw.page ?? 1), q: String(raw.q ?? '') }),
          handler,
          path: '/search',
        },
      },
    });

    await settle();

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: { page: 2, q: 'hello' } }));
    router.dispose();
  });

  it('leaves query as raw strings when coerceSearch is absent', async () => {
    const handler = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/page?x=1'),
      routes: { page: { handler, path: '/page' } },
    });

    await settle();

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: { x: '1' } }));
    router.dispose();
  });

  it('falls back to the raw query when coerceSearch throws', async () => {
    const handler = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/page?x=bad'),
      routes: {
        page: {
          coerceSearch: () => {
            throw new Error('invalid');
          },
          handler,
          path: '/page',
        },
      },
    });

    await settle();

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: { x: 'bad' } }));
    router.dispose();
  });

  it('applies child coerceSearch for nested routes', async () => {
    const handler = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/dashboard/settings?tab=3'),
      routes: {
        dashboard: {
          children: {
            settings: {
              coerceSearch: (raw) => ({ tab: Number(raw.tab ?? 0) }),
              handler,
              path: 'settings',
            },
          },
          path: '/dashboard',
        },
      },
    });

    await settle();

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: { tab: 3 } }));
    router.dispose();
  });
});

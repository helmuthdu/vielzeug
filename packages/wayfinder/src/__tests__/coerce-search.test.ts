/**
 * coerceSearch — per-route query string coercion.
 */
import { createMemoryHistory, createRouter } from '../';
import { settle } from './test-utils';

describe('coerceSearch', () => {
  it('transforms raw query params when coerceSearch is provided', async () => {
    const data = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/search?q=hello&page=2'),
      routes: {
        search: {
          coerceSearch: (raw) => ({ page: Number(raw.page ?? 1), q: String(raw.q ?? '') }),
          data,
          path: '/search',
        },
      },
    });

    await settle();

    expect(data).toHaveBeenCalledWith(expect.objectContaining({ query: { page: 2, q: 'hello' } }));
    router.dispose();
  });

  it('leaves query as raw strings when coerceSearch is absent', async () => {
    const data = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/page?x=1'),
      routes: { page: { data, path: '/page' } },
    });

    await settle();

    expect(data).toHaveBeenCalledWith(expect.objectContaining({ query: { x: '1' } }));
    router.dispose();
  });

  it('falls back to the raw query when coerceSearch throws', async () => {
    const data = vi.fn();
    const onError = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/page?x=bad'),
      onError,
      routes: {
        page: {
          coerceSearch: () => {
            throw new Error('invalid');
          },
          data,
          path: '/page',
        },
      },
    });

    await settle();

    expect(data).toHaveBeenCalledWith(expect.objectContaining({ query: { x: 'bad' } }));
    expect(onError).toHaveBeenCalledWith(expect.any(Error), { source: 'coerce-search' });
    router.dispose();
  });

  it('applies child coerceSearch for nested routes', async () => {
    const data = vi.fn();
    const router = createRouter({
      history: createMemoryHistory('/dashboard/settings?tab=3'),
      routes: {
        dashboard: {
          children: {
            settings: {
              coerceSearch: (raw) => ({ tab: Number(raw.tab ?? 0) }),
              data,
              path: 'settings',
            },
          },
          path: '/dashboard',
        },
      },
    });

    await settle();

    expect(data).toHaveBeenCalledWith(expect.objectContaining({ query: { tab: 3 } }));
    router.dispose();
  });
});

import { createMemoryHistory, createRouter } from '../router';

async function settle(): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, 10));
}

describe('coerceSearch', () => {
  it('coerces query params when coerceSearch is provided', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/search?q=hello&page=2');
    const router = createRouter({
      history,
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

  it('leaves query unchanged when coerceSearch is absent', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/page?x=1');
    const router = createRouter({
      history,
      routes: { page: { handler, path: '/page' } },
    });

    await settle();
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: { x: '1' } }));
    router.dispose();
  });

  it('leaves query unchanged when coerceSearch throws', async () => {
    const handler = vi.fn();
    const history = createMemoryHistory('/page?x=bad');
    const router = createRouter({
      history,
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
    // raw query is preserved when validation throws
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ query: { x: 'bad' } }));
    router.dispose();
  });
});

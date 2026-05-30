import type { FetchMiddleware } from '../middleware';

import { composeFetch } from '../middleware';

type Query = { page: number };
type Result = { items: string[]; total: number };

describe('composeFetch', () => {
  it('calls the base fetch when no middleware provided', async () => {
    const base = vi.fn(
      async (_q: Query, _sig: AbortSignal): Promise<Result> => ({
        items: ['a'],
        total: 1,
      }),
    );
    const composed = composeFetch(base);

    const result = await composed({ page: 1 }, new AbortController().signal);

    expect(base).toHaveBeenCalledOnce();
    expect(result).toEqual({ items: ['a'], total: 1 });
  });

  it('single middleware wraps the base fetch', async () => {
    const order: string[] = [];

    const base = vi.fn(async (): Promise<Result> => {
      order.push('base');

      return { items: ['base'], total: 1 };
    });

    const mw: FetchMiddleware<Query, Result> = async (q, sig, next) => {
      order.push('before');

      const result = await next(q, sig);

      order.push('after');

      return result;
    };

    const composed = composeFetch(base, mw);

    await composed({ page: 1 }, new AbortController().signal);

    expect(order).toEqual(['before', 'base', 'after']);
  });

  it('multiple middlewares execute left-to-right (outer-to-inner)', async () => {
    const order: string[] = [];

    const base = vi.fn(async (): Promise<Result> => {
      order.push('base');

      return { items: [], total: 0 };
    });

    const mw1: FetchMiddleware<Query, Result> = async (q, sig, next) => {
      order.push('mw1-before');

      const r = await next(q, sig);

      order.push('mw1-after');

      return r;
    };

    const mw2: FetchMiddleware<Query, Result> = async (q, sig, next) => {
      order.push('mw2-before');

      const r = await next(q, sig);

      order.push('mw2-after');

      return r;
    };

    const composed = composeFetch(base, mw1, mw2);

    await composed({ page: 1 }, new AbortController().signal);

    // mw1 is outermost (called first), mw2 is inner, then base.
    expect(order).toEqual(['mw1-before', 'mw2-before', 'base', 'mw2-after', 'mw1-after']);
  });

  it('middleware can transform the query', async () => {
    const base = vi.fn(async (q: Query): Promise<Result> => ({ items: [`p${q.page}`], total: 1 }));

    const mw: FetchMiddleware<Query, Result> = async (q, sig, next) => next({ page: q.page + 10 }, sig);

    const composed = composeFetch(base, mw);
    const result = await composed({ page: 1 }, new AbortController().signal);

    expect(base).toHaveBeenCalledWith({ page: 11 }, expect.any(AbortSignal));
    expect(result.items).toEqual(['p11']);
  });

  it('middleware can transform the result', async () => {
    const base = vi.fn(async (): Promise<Result> => ({ items: ['x'], total: 1 }));

    const mw: FetchMiddleware<Query, Result> = async (q, sig, next) => {
      const r = await next(q, sig);

      return { ...r, items: r.items.map((i) => `${i}-transformed`) };
    };

    const composed = composeFetch(base, mw);
    const result = await composed({ page: 1 }, new AbortController().signal);

    expect(result.items).toEqual(['x-transformed']);
  });

  it('middleware can short-circuit without calling next', async () => {
    const base = vi.fn(async (): Promise<Result> => ({ items: ['from-base'], total: 1 }));

    const cache: FetchMiddleware<Query, Result> = async () => ({ items: ['from-cache'], total: 1 });

    const composed = composeFetch(base, cache);
    const result = await composed({ page: 1 }, new AbortController().signal);

    expect(base).not.toHaveBeenCalled();
    expect(result.items).toEqual(['from-cache']);
  });
});

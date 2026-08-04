import { describe, expect, it, vi } from 'vitest';

import { createCourier } from '../courier';

describe('createCourier', () => {
  it('shares interceptors and headers across REST and streams', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response('hello', { status: 200 }));
    const courier = createCourier({ fetch, headers: { authorization: 'Bearer token' } });

    courier.use(async (context, next) => next(context.withHeaders({ 'x-request-id': 'request-1' })));

    await courier.get('/users');
    await courier.read('/events').next();

    expect(fetch).toHaveBeenCalledTimes(2);
    for (const [, init] of fetch.mock.calls) {
      expect(init?.headers).toMatchObject({ authorization: 'Bearer token', 'x-request-id': 'request-1' });
    }
  });

  it('passes its query cache to successful mutations', async () => {
    const courier = createCourier();
    const onSuccess = vi.fn((data: { id: number }, queries) => queries.set(['users', data.id], data));

    await courier.mutate({ onSuccess, request: async () => ({ id: 1 }) });

    expect(onSuccess).toHaveBeenCalledOnce();
    expect(courier.queries.get(['users', 1])).toEqual({ id: 1 });
  });

  it('cancels active mutations and prevents new requests after disposal', async () => {
    const courier = createCourier();
    const started = new Promise<void>((resolve) => {
      void courier
        .mutate({
          request: ({ signal }) =>
            new Promise((_, reject) => {
              signal.addEventListener('abort', () => reject(new Error('aborted')));
              resolve();
            }),
        })
        .catch(() => {});
    });

    await started;
    courier.dispose();

    await expect(courier.mutate({ request: async () => 'never' })).rejects.toThrow('Courier disposed');
    await expect(
      courier.queries.create({ fetch: async () => 'never', key: ['disposed-query'] }).fetch(),
    ).rejects.toThrow('QueryCache disposed');
  });

  it('cancels active query fetches', async () => {
    const courier = createCourier();
    let querySignal: AbortSignal | undefined;
    const query = courier.queries.create({
      fetch: ({ signal }) =>
        new Promise<never>((_, reject) => {
          querySignal = signal;
          signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
      key: ['active-query'],
    });

    const pending = query.fetch();

    await vi.waitFor(() => expect(querySignal).toBeDefined());
    courier.cancelAll();

    expect(querySignal!.aborted).toBe(true);
    await expect(pending).rejects.toThrow('aborted');
  });
});

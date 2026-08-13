import { describe, expect, it, vi } from 'vitest';

import {
  type CourierHttpError,
  CourierSchemaValidationError,
  CourierTimeoutError,
  createCourier,
  withBearerAuth,
  withRequestId,
} from '../index';

describe('Courier HTTP client', () => {
  it('builds requests, validates responses, and applies interceptors', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () =>
        new Response(JSON.stringify({ id: 1, name: 'Ada' }), { headers: { 'content-type': 'application/json' } }),
    );
    const courier = createCourier({ baseUrl: 'https://api.example.com/', fetch });

    courier.use(withBearerAuth('token'));
    courier.use(withRequestId({ generate: () => 'request-1' }));

    await expect(
      courier.post('/users/{id}', {
        body: { name: 'Ada' },
        params: { id: 'a/b' },
        query: { include: ['roles', 'teams'] },
        schema: { parse: (data) => data as { id: number; name: string } },
      }),
    ).resolves.toEqual({ id: 1, name: 'Ada' });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/users/a%2Fb?include=roles&include=teams',
      expect.objectContaining({
        body: JSON.stringify({ name: 'Ada' }),
        headers: expect.objectContaining({
          authorization: 'Bearer token',
          'content-type': 'application/json',
          'x-request-id': 'request-1',
        }),
        method: 'POST',
      }),
    );
  });

  it('does not deduplicate independent HTTP requests', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }),
    );
    const courier = createCourier({ fetch });

    await Promise.all([courier.get('/profile'), courier.get('/profile')]);

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('preserves HTTP error bodies and wraps schema failures', async () => {
    const httpCourier = createCourier({
      fetch: vi.fn(async () => new Response(JSON.stringify({ code: 'missing' }), { status: 404 })),
    });
    const schemaCourier = createCourier({
      fetch: vi.fn(
        async () => new Response(JSON.stringify({ id: 'wrong' }), { headers: { 'content-type': 'application/json' } }),
      ),
    });

    await expect(httpCourier.get('/users/1')).rejects.toMatchObject<CourierHttpError>({
      data: '{"code":"missing"}',
      status: 404,
    });
    await expect(
      schemaCourier.get('/users/1', {
        schema: {
          parse: () => {
            throw new Error('id must be a number');
          },
        },
      }),
    ).rejects.toBeInstanceOf(CourierSchemaValidationError);
  });

  it('normalizes request timeouts and rejects requests after disposal', async () => {
    const courier = createCourier({
      fetch: vi.fn<typeof globalThis.fetch>(
        (_, init) =>
          new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('Timed out', 'TimeoutError')));
          }),
      ),
    });

    await expect(courier.get('/slow', { timeout: 1 })).rejects.toBeInstanceOf(CourierTimeoutError);

    courier.dispose();

    await expect(courier.get('/after-disposal')).rejects.toThrow('Courier disposed');
  });
});

describe('Courier mutations', () => {
  it('runs each mutation once and exposes the query cache to onSuccess', async () => {
    const courier = createCourier();
    const request = vi.fn(async () => ({ id: 1 }));

    await courier.mutate({
      onSuccess: (user, queries) => queries.set(['users', user.id], user),
      request,
    });

    expect(request).toHaveBeenCalledOnce();
    expect(courier.queries.get(['users', 1])).toEqual({ id: 1 });
  });

  it('cancels active mutations and rejects new mutations after disposal', async () => {
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
  });
});

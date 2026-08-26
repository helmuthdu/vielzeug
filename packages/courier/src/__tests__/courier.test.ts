import { describe, expect, it, vi } from 'vitest';

import {
  CourierSchemaValidationError,
  CourierTimeoutError,
  createCourier,
  withBearerAuth,
  withLogging,
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
      fetch: vi.fn(
        async () =>
          new Response(JSON.stringify({ code: 'missing' }), {
            headers: { 'content-type': 'application/json' },
            status: 404,
          }),
      ),
    });
    const schemaCourier = createCourier({
      fetch: vi.fn(
        async () => new Response(JSON.stringify({ id: 'wrong' }), { headers: { 'content-type': 'application/json' } }),
      ),
    });

    await expect(httpCourier.get('/users/1')).rejects.toMatchObject({
      data: { code: 'missing' },
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

  it('updates global headers via setHeaders', () => {
    const courier = createCourier();

    courier.setHeaders({ authorization: 'Bearer token' });
    expect(courier.getHeaders()).toEqual({ authorization: 'Bearer token' });

    courier.setHeaders({ authorization: undefined });
    expect(courier.getHeaders()).toEqual({});
  });

  it('withLogging requires an explicit logger', async () => {
    const logs: string[] = [];
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response('ok', { headers: { 'content-type': 'text/plain' } }),
    );
    const courier = createCourier({ fetch });

    courier.use(withLogging({ logger: (msg) => logs.push(msg) }));

    await courier.get('/test');

    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain('GET test 200');
  });

  it('handles empty JSON response bodies gracefully', async () => {
    const courier = createCourier({
      fetch: vi.fn(async () => new Response('', { headers: { 'content-type': 'application/json' }, status: 200 })),
    });

    await expect(courier.get('/empty')).resolves.toBeUndefined();
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

  it('invalidates and refetches via invalidateKeys after success', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response(JSON.stringify([{ id: 1 }]), { headers: { 'content-type': 'application/json' } }),
    );
    const courier = createCourier({ fetch });
    const key = ['users'] as const;

    await courier.queries.fetch({
      fetch: () => courier.get('/users'),
      key,
      staleTime: 60_000,
    });

    expect(fetch).toHaveBeenCalledOnce();

    await courier.mutate({
      invalidateKeys: [key],
      request: async () => ({ id: 2 }),
    });

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });
});

describe('tap()', () => {
  it('emits request-start and request-success events on a successful request', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }),
    );
    const courier = createCourier({ fetch });
    const handler = vi.fn();

    courier.tap(handler);

    await courier.get('/health');

    const start = handler.mock.calls.find(([{ type }]) => type === 'request-start')?.[0];
    const success = handler.mock.calls.find(([{ type }]) => type === 'request-success')?.[0];

    expect(start).toEqual({ method: 'GET', type: 'request-start', url: 'health' });
    expect(success).toMatchObject({ method: 'GET', status: 200, type: 'request-success', url: 'health' });
    expect(typeof success?.duration).toBe('number');
  });

  it('emits request-start and request-error events on a failed request', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () =>
        new Response(JSON.stringify({ code: 'missing' }), {
          headers: { 'content-type': 'application/json' },
          status: 404,
        }),
    );
    const courier = createCourier({ fetch });
    const handler = vi.fn();

    courier.tap(handler);

    await expect(courier.get('/users/1')).rejects.toMatchObject({ status: 404 });

    const start = handler.mock.calls.find(([{ type }]) => type === 'request-start')?.[0];
    const error = handler.mock.calls.find(([{ type }]) => type === 'request-error')?.[0];

    expect(start).toEqual({ method: 'GET', type: 'request-start', url: 'users/1' });
    expect(error).toMatchObject({ method: 'GET', type: 'request-error', url: 'users/1' });
    expect(error?.error).toBeInstanceOf(Error);
  });

  it('emits a dispose event on dispose', () => {
    const courier = createCourier();
    const handler = vi.fn();

    courier.tap(handler);
    courier.dispose();

    expect(handler).toHaveBeenCalledWith({ type: 'dispose' });
  });

  it('returns an unsubscribe function that stops events', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }),
    );
    const courier = createCourier({ fetch });
    const handler = vi.fn();

    const unsubscribe = courier.tap(handler);

    unsubscribe();

    await courier.get('/health');

    expect(handler).not.toHaveBeenCalled();
  });

  it('auto-detaches on signal abort', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }),
    );
    const courier = createCourier({ fetch });
    const handler = vi.fn();
    const controller = new AbortController();

    courier.tap(handler, { signal: controller.signal });
    controller.abort();

    await courier.get('/health');

    expect(handler).not.toHaveBeenCalled();
  });

  it('swallows handler errors without affecting the request', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }),
    );
    const courier = createCourier({ fetch });
    const boom = vi.fn(() => {
      throw new Error('handler blew up');
    });

    courier.tap(boom);

    await expect(courier.get('/health')).resolves.toEqual({ ok: true });
    expect(boom).toHaveBeenCalled();
  });

  it('returns a no-op unsubscribe when called after dispose', () => {
    const courier = createCourier();
    const handler = vi.fn();

    courier.dispose();

    const unsubscribe = courier.tap(handler);
    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
  });
});

import { describe, expect, it, vi } from 'vitest';

import type { FetchContext } from '../transport';

import { withBearerAuth, withLogging, withRequestId } from '../interceptors';

// Minimal next() helper that returns a mock Response
function makeNext(status = 200) {
  return async (_ctx: FetchContext) => new Response(null, { status });
}

function makeCtx(overrides?: Partial<FetchContext>): FetchContext {
  return {
    init: { headers: {}, method: 'GET' },
    url: 'https://api.example.com/test',
    ...overrides,
  };
}

describe('withBearerAuth', () => {
  it('injects a static Bearer token header', async () => {
    const interceptor = withBearerAuth('my-token');
    const ctx = makeCtx();

    await interceptor(ctx, makeNext());

    expect((ctx.init.headers as Record<string, string>).authorization).toBe('Bearer my-token');
  });

  it('injects a token from an async function', async () => {
    const interceptor = withBearerAuth(async () => 'dynamic-token');
    const ctx = makeCtx();

    await interceptor(ctx, makeNext());

    expect((ctx.init.headers as Record<string, string>).authorization).toBe('Bearer dynamic-token');
  });

  it('preserves existing headers', async () => {
    const interceptor = withBearerAuth('tok');
    const ctx = makeCtx({ init: { headers: { 'x-trace': '123' }, method: 'GET' } });

    await interceptor(ctx, makeNext());

    const h = ctx.init.headers as Record<string, string>;

    expect(h['x-trace']).toBe('123');
    expect(h.authorization).toBe('Bearer tok');
  });

  it('handles undefined ctx.init.headers gracefully', async () => {
    const interceptor = withBearerAuth('tok');
    const ctx = makeCtx({ init: { method: 'GET' } });

    await interceptor(ctx, makeNext());

    expect((ctx.init.headers as Record<string, string>).authorization).toBe('Bearer tok');
  });

  it('handles Headers instance in ctx.init.headers', async () => {
    const interceptor = withBearerAuth('tok');
    const ctx = makeCtx({ init: { headers: new Headers({ 'x-existing': 'yes' }), method: 'GET' } });

    await interceptor(ctx, makeNext());

    const h = ctx.init.headers as Record<string, string>;

    expect(h['x-existing']).toBe('yes');
    expect(h.authorization).toBe('Bearer tok');
  });
});

describe('withRequestId', () => {
  it('adds x-request-id header by default', async () => {
    const interceptor = withRequestId();
    const ctx = makeCtx();

    await interceptor(ctx, makeNext());

    const id = (ctx.init.headers as Record<string, string>)['x-request-id'];

    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
  });

  it('uses a custom header name', async () => {
    const interceptor = withRequestId({ header: 'x-trace-id' });
    const ctx = makeCtx();

    await interceptor(ctx, makeNext());

    expect((ctx.init.headers as Record<string, string>)['x-trace-id']).toBeDefined();
  });

  it('uses a custom generator function', async () => {
    const interceptor = withRequestId({ generate: () => 'fixed-id' });
    const ctx = makeCtx();

    await interceptor(ctx, makeNext());

    expect((ctx.init.headers as Record<string, string>)['x-request-id']).toBe('fixed-id');
  });
});

describe('withLogging', () => {
  it('logs method, url, status, and duration on success', async () => {
    const logger = vi.fn();
    const interceptor = withLogging({ logger });
    const ctx = makeCtx();

    await interceptor(ctx, makeNext(200));

    expect(logger).toHaveBeenCalledTimes(1);

    const [msg, meta] = logger.mock.calls[0];

    expect(msg).toContain('GET');
    expect(msg).toContain('200');
    expect(meta.method).toBe('GET');
    expect(meta.status).toBe(200);
    expect(meta.url).toBe('https://api.example.com/test');
    expect(typeof meta.duration).toBe('number');
  });

  it('logs with status 0 and rethrows on error', async () => {
    const logger = vi.fn();
    const interceptor = withLogging({ logger });
    const ctx = makeCtx();

    await expect(
      interceptor(ctx, async () => {
        throw new Error('network error');
      }),
    ).rejects.toThrow('network error');

    expect(logger).toHaveBeenCalledTimes(1);
    expect(logger.mock.calls[0][1].status).toBe(0);
  });
});

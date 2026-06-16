import { describe, expect, it, vi } from 'vitest';

import type { FetchContext } from '../transport';

import { withBearerAuth, withLogging, withRequestId } from '../interceptors';

// Build a minimal FetchContext that matches the new immutable shape
function makeCtx(headers: Record<string, string> = {}, method = 'GET'): FetchContext {
  const ctx: FetchContext = {
    headers,
    init: { method },
    url: 'https://api.example.com/test',
    withHeaders(updates) {
      const merged = { ...headers };

      for (const [k, v] of Object.entries(updates)) merged[k.toLowerCase()] = v;

      return makeCtx(merged, method);
    },
  };

  return ctx;
}

// Captures the ctx passed to next() so we can inspect headers set by interceptors
function capturingNext(captured: { ctx?: FetchContext }, status = 200) {
  return async (ctx: FetchContext) => {
    captured.ctx = ctx;

    return new Response(null, { status });
  };
}

describe('withBearerAuth', () => {
  it('injects a static Bearer token header', async () => {
    const interceptor = withBearerAuth('my-token');
    const ctx = makeCtx();
    const captured: { ctx?: FetchContext } = {};

    await interceptor(ctx, capturingNext(captured));

    expect(captured.ctx?.headers.authorization).toBe('Bearer my-token');
  });

  it('injects a token from an async function', async () => {
    const interceptor = withBearerAuth(async () => 'dynamic-token');
    const ctx = makeCtx();
    const captured: { ctx?: FetchContext } = {};

    await interceptor(ctx, capturingNext(captured));

    expect(captured.ctx?.headers.authorization).toBe('Bearer dynamic-token');
  });

  it('preserves existing headers', async () => {
    const interceptor = withBearerAuth('tok');
    const ctx = makeCtx({ 'x-trace': '123' });
    const captured: { ctx?: FetchContext } = {};

    await interceptor(ctx, capturingNext(captured));

    expect(captured.ctx?.headers['x-trace']).toBe('123');
    expect(captured.ctx?.headers.authorization).toBe('Bearer tok');
  });

  it('does not mutate the original context', async () => {
    const interceptor = withBearerAuth('tok');
    const ctx = makeCtx();

    await interceptor(ctx, async (c) => {
      // next receives a new ctx with the header
      expect(c.headers.authorization).toBe('Bearer tok');

      return new Response(null, { status: 200 });
    });

    // original ctx is unchanged
    expect(ctx.headers.authorization).toBeUndefined();
  });
});

describe('withRequestId', () => {
  it('adds x-request-id header by default', async () => {
    const interceptor = withRequestId();
    const ctx = makeCtx();
    const captured: { ctx?: FetchContext } = {};

    await interceptor(ctx, capturingNext(captured));

    const id = captured.ctx?.headers['x-request-id'];

    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
  });

  it('uses a custom header name', async () => {
    const interceptor = withRequestId({ header: 'x-trace-id' });
    const ctx = makeCtx();
    const captured: { ctx?: FetchContext } = {};

    await interceptor(ctx, capturingNext(captured));

    expect(captured.ctx?.headers['x-trace-id']).toBeDefined();
  });

  it('uses a custom generator function', async () => {
    const interceptor = withRequestId({ generate: () => 'fixed-id' });
    const ctx = makeCtx();
    const captured: { ctx?: FetchContext } = {};

    await interceptor(ctx, capturingNext(captured));

    expect(captured.ctx?.headers['x-request-id']).toBe('fixed-id');
  });
});

describe('withLogging', () => {
  it('logs method, url, status, and duration on success', async () => {
    const logger = vi.fn();
    const interceptor = withLogging({ logger });
    const ctx = makeCtx();

    await interceptor(ctx, capturingNext({}, 200));

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

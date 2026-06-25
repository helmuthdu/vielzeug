import { describe, expect, it, vi } from 'vitest';

import { CourierError } from '../errors';
import { anySignal, buildTimeoutSignal, createTransportCore, validateTimeout } from '../transport';

describe('validateTimeout', () => {
  it('accepts positive finite numbers', () => {
    expect(() => validateTimeout(1)).not.toThrow();
    expect(() => validateTimeout(30_000)).not.toThrow();
  });

  it('accepts Infinity', () => {
    expect(() => validateTimeout(Number.POSITIVE_INFINITY)).not.toThrow();
  });

  it('rejects zero', () => {
    expect(() => validateTimeout(0)).toThrow(CourierError);
  });

  it('rejects negative values', () => {
    expect(() => validateTimeout(-1)).toThrow(CourierError);
  });

  it('rejects NaN', () => {
    expect(() => validateTimeout(NaN)).toThrow(CourierError);
  });
});

describe('anySignal', () => {
  it('returns undefined when no signals are provided', () => {
    expect(anySignal()).toBeUndefined();
  });

  it('returns undefined when all signals are null/undefined', () => {
    expect(anySignal(null, undefined)).toBeUndefined();
  });

  it('returns the single signal when only one active signal is given', () => {
    const ac = new AbortController();

    expect(anySignal(ac.signal)).toBe(ac.signal);
  });

  it('returns a combined signal from two active signals', () => {
    const a = new AbortController();
    const b = new AbortController();
    const combined = anySignal(a.signal, b.signal);

    expect(combined).toBeDefined();
    expect(combined!.aborted).toBe(false);

    a.abort();
    expect(combined!.aborted).toBe(true);
  });

  it('combined signal aborts when the second signal aborts', () => {
    const a = new AbortController();
    const b = new AbortController();
    const combined = anySignal(a.signal, b.signal);

    b.abort();
    expect(combined!.aborted).toBe(true);
  });

  it('skips null/undefined and combines the rest', () => {
    const a = new AbortController();
    const combined = anySignal(null, a.signal, undefined);

    expect(combined).toBe(a.signal);
  });
});

describe('buildTimeoutSignal', () => {
  it('returns the external signal when timeout is Infinity', () => {
    const ac = new AbortController();
    const result = buildTimeoutSignal(Number.POSITIVE_INFINITY, ac.signal);

    expect(result).toBe(ac.signal);
  });

  it('returns undefined when timeout is Infinity and no external signal', () => {
    expect(buildTimeoutSignal(Number.POSITIVE_INFINITY)).toBeUndefined();
  });

  it('returns a non-aborted AbortSignal when given a positive timeout', () => {
    // AbortSignal.timeout() is native and does not integrate with fake timers;
    // we verify the structural contract: a signal is returned and starts unaborted.
    const result = buildTimeoutSignal(100);

    expect(result).toBeDefined();
    expect(result!.aborted).toBe(false);
  });
});

describe('createTransportCore', () => {
  it('uses globalThis.fetch by default', async () => {
    const fakeFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));

    globalThis.fetch = fakeFetch as typeof fetch;

    const transport = createTransportCore({ baseUrl: 'https://example.com' });

    await transport.dispatch({ init: { method: 'GET' }, url: 'https://example.com/test' });

    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });

  it('normalizes header keys to lowercase on init', () => {
    const transport = createTransportCore({ headers: { Authorization: 'Bearer tok', 'X-App': 'v1' } });
    const headers = transport.getHeaders();

    expect(headers['x-app']).toBe('v1');
    expect(headers['authorization']).toBe('Bearer tok');
  });

  it('headers() updates and deletes global headers', () => {
    const transport = createTransportCore({ headers: { 'x-app': 'v1' } });

    transport.headers({ 'x-app': 'v2', 'x-new': 'hello' });
    expect(transport.getHeaders()['x-app']).toBe('v2');
    expect(transport.getHeaders()['x-new']).toBe('hello');

    transport.headers({ 'x-new': undefined });
    expect(transport.getHeaders()['x-new']).toBeUndefined();
  });

  it('mergeHeaders combines global, per-request, and extra headers', () => {
    const transport = createTransportCore({ headers: { 'x-global': 'g' } });
    const merged = transport.mergeHeaders({ 'X-Request': 'r' }, { 'x-extra': 'e' });

    expect(merged['x-global']).toBe('g');
    expect(merged['x-request']).toBe('r');
    expect(merged['x-extra']).toBe('e');
  });

  it('per-request headers override global headers', () => {
    const transport = createTransportCore({ headers: { 'x-app': 'global' } });
    const merged = transport.mergeHeaders({ 'x-app': 'per-request' });

    expect(merged['x-app']).toBe('per-request');
  });

  it('use() registers and removes interceptors', async () => {
    const log: string[] = [];
    const fakeFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const transport = createTransportCore({ fetch: fakeFetch as typeof fetch });

    const remove = transport.use(async (ctx, next) => {
      log.push('before');

      const res = await next(ctx);

      log.push('after');

      return res;
    });

    await transport.dispatch({ init: { method: 'GET' }, url: 'https://example.com' });
    expect(log).toEqual(['before', 'after']);

    remove();
    log.length = 0;
    await transport.dispatch({ init: { method: 'GET' }, url: 'https://example.com' });
    expect(log).toHaveLength(0);
  });

  it('track() registers an AbortController that cancelAll() aborts', () => {
    const transport = createTransportCore();
    const ac = new AbortController();
    const untrack = transport.track(ac);

    transport.cancelAll();
    expect(ac.signal.aborted).toBe(true);

    untrack();
  });

  it('track() untrack() removes the controller from active set', () => {
    const transport = createTransportCore();
    const ac = new AbortController();
    const untrack = transport.track(ac);

    untrack();
    transport.cancelAll();
    expect(ac.signal.aborted).toBe(false);
  });

  it('dispose() marks the transport as disposed and aborts tracked controllers', () => {
    const transport = createTransportCore();
    const ac = new AbortController();

    transport.track(ac);
    expect(transport.disposed).toBe(false);
    transport.dispose();
    expect(transport.disposed).toBe(true);
    expect(ac.signal.aborted).toBe(true);
  });

  it('throws on invalid timeout', () => {
    expect(() => createTransportCore({ timeout: 0 })).toThrow(CourierError);
    expect(() => createTransportCore({ timeout: -100 })).toThrow(CourierError);
  });

  it('headers() sets and updates global headers', () => {
    const transport = createTransportCore({ headers: { 'x-app': 'v1' } });

    expect(transport.getHeaders()['x-app']).toBe('v1');

    transport.headers({ 'x-app': 'v2', 'x-new': 'yes' });

    expect(transport.getHeaders()['x-app']).toBe('v2');
    expect(transport.getHeaders()['x-new']).toBe('yes');
  });

  it('headers() deletes a header when value is undefined', () => {
    const transport = createTransportCore({ headers: { 'x-old': 'keep', 'x-remove': 'gone' } });

    transport.headers({ 'x-remove': undefined });

    expect(transport.getHeaders()['x-remove']).toBeUndefined();
    expect(transport.getHeaders()['x-old']).toBe('keep');
  });
});

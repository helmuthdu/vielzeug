import { describe, expect, it, vi } from 'vitest';
import { PUBLISHER_HEADER, REQUEST_MARKER_HEADER, SESSION_COOKIE_NAME } from '../contract';
import { type ApiConfig, type ArchiveWorkerEnv, apiConfig, type D1Like } from '../worker/env';
import { corsHeaders, preflight, readJsonBody, requireMutationGuard, sessionToken } from '../worker/http';

/** A real config from a minimal local env: loopback HTTP origins are legal there. */
const config = (): ApiConfig =>
  apiConfig({
    ALLOWED_ORIGINS: 'http://127.0.0.1:5173',
    APP_ENV: 'local',
    AUTH_ISSUER_SERVICE: { fetch: async () => Response.json({ ok: true }) },
    DB: {
      batch: async () => [],
      prepare: () => {
        throw new Error('Unused test binding');
      },
    } satisfies D1Like,
    JWT_AUDIENCE: 'https://api.example.test',
    JWT_ISSUER: 'http://127.0.0.1:8930',
    JWT_JWKS_URL: 'http://127.0.0.1:8930/jwks',
    LIKES_ENABLED: 'true',
    PUBLISHING_ENABLED: 'true',
    RATE_LIMIT_KEY_SECRET: 'test-pepper',
    READ_LIMIT: { limit: async () => ({ success: true }) },
    WRITE_LIMIT: { limit: async () => ({ success: true }) },
  } satisfies ArchiveWorkerEnv);

// `duplex` is Node/undici's addition for streaming bodies; DOM's RequestInit omits it.
const request = (init: RequestInit & { duplex?: 'half'; url?: string } = {}): Request =>
  new Request(init.url ?? 'https://api.example.test/api/v1/collections/fixture/entries', init);

/** Captures the thrown value of a synchronous guard for object matching. */
const thrownBy = (fn: () => unknown): unknown => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
};

describe('readJsonBody', () => {
  it('rejects a non-JSON media type as 415', async () => {
    const req = request({ body: '{}', headers: { 'content-type': 'text/plain' }, method: 'POST' });
    await expect(readJsonBody(req)).rejects.toMatchObject({ code: 'unsupported-media', status: 415 });
  });

  it('rejects a body over the request-byte ceiling as 413', async () => {
    const req = request({
      body: 'x'.repeat(12 * 1024 + 1),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
    await expect(readJsonBody(req)).rejects.toMatchObject({ code: 'too-large', status: 413 });
  });

  it('rejects a stalled body stream as 408 after the deadline', async () => {
    vi.useFakeTimers();
    try {
      const stream = new ReadableStream({ start() {} });
      const req = request({
        body: stream,
        duplex: 'half',
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      });
      const expectation = expect(readJsonBody(req)).rejects.toMatchObject({ code: 'timeout', status: 408 });
      await vi.advanceTimersByTimeAsync(10_000);
      await expectation;
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects malformed JSON as 400', async () => {
    const req = request({ body: 'not json', headers: { 'content-type': 'application/json' }, method: 'POST' });
    await expect(readJsonBody(req)).rejects.toMatchObject({ code: 'bad-request', status: 400 });
  });

  it('rejects an empty body as 400', async () => {
    const req = request({ body: '', headers: { 'content-type': 'application/json' }, method: 'POST' });
    await expect(readJsonBody(req)).rejects.toMatchObject({ code: 'bad-request', status: 400 });
  });
});

describe('sessionToken', () => {
  it('rejects a duplicate session cookie as 400', () => {
    const req = request({ headers: { cookie: `${SESSION_COOKIE_NAME}=a; ${SESSION_COOKIE_NAME}=b` } });
    expect(thrownBy(() => sessionToken(req))).toMatchObject({ code: 'bad-request', status: 400 });
  });

  it('returns the single cookie value', () => {
    const req = request({ headers: { cookie: `other=1; ${SESSION_COOKIE_NAME}=token` } });
    expect(sessionToken(req)).toBe('token');
  });

  it('returns null without a cookie header', () => {
    expect(sessionToken(request())).toBeNull();
  });
});

describe('requireMutationGuard', () => {
  it('passes an allowed origin with the request marker', () => {
    const req = request({
      headers: { origin: 'http://127.0.0.1:5173', [REQUEST_MARKER_HEADER]: '1' },
      method: 'POST',
    });
    expect(thrownBy(() => requireMutationGuard(req, config()))).toBeUndefined();
  });

  it('rejects a missing origin as 403', () => {
    const req = request({ headers: { [REQUEST_MARKER_HEADER]: '1' }, method: 'POST' });
    expect(thrownBy(() => requireMutationGuard(req, config()))).toMatchObject({ code: 'forbidden', status: 403 });
  });

  it('rejects a foreign origin as 403', () => {
    const req = request({
      headers: { origin: 'https://evil.example.net', [REQUEST_MARKER_HEADER]: '1' },
      method: 'POST',
    });
    expect(thrownBy(() => requireMutationGuard(req, config()))).toMatchObject({ code: 'forbidden', status: 403 });
  });

  it('rejects a missing request marker as 403', () => {
    const req = request({ headers: { origin: 'http://127.0.0.1:5173' }, method: 'POST' });
    expect(thrownBy(() => requireMutationGuard(req, config()))).toMatchObject({ code: 'forbidden', status: 403 });
  });
});

describe('corsHeaders', () => {
  it('returns the credential contract for an allowed origin', () => {
    const req = request({ headers: { origin: 'http://127.0.0.1:5173' } });
    expect(corsHeaders(req, config())).toEqual({
      'access-control-allow-credentials': 'true',
      'access-control-allow-origin': 'http://127.0.0.1:5173',
      vary: 'Origin',
    });
  });

  it('returns no headers for a foreign origin', () => {
    const req = request({ headers: { origin: 'https://evil.example.net' } });
    expect(corsHeaders(req, config())).toEqual({});
  });
});

describe('preflight', () => {
  it('answers an allowed origin with the contract allow-headers', () => {
    const req = request({ headers: { origin: 'http://127.0.0.1:5173' }, method: 'OPTIONS' });
    const response = preflight(req, config());
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-headers')).toBe(
      `Content-Type, ${PUBLISHER_HEADER}, ${REQUEST_MARKER_HEADER}`,
    );
    expect(response.headers.get('access-control-allow-origin')).toBe('http://127.0.0.1:5173');
  });

  it('rejects a foreign origin as 403', () => {
    const req = request({ headers: { origin: 'https://evil.example.net' }, method: 'OPTIONS' });
    const response = preflight(req, config());
    expect(response.status).toBe(403);
  });
});

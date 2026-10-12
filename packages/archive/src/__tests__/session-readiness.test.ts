import { createRemoteJWKSet, customFetch, decodeJwt, importJWK, SignJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type AuthEvent, createAuthWorker } from '../auth';
import { ACCOUNT_HEADER, AUTH_SCHEMA_VERSION, archiveAuthHealthSchema, archiveOkSchema } from '../contract';
import { verifySession } from '../worker/auth';
import { type ArchiveWorkerEnv, apiConfig } from '../worker/env';
import { createArchiveWorker } from '../worker/worker';
import {
  APP_ORIGIN,
  cookiePair,
  harness,
  lastLinkToken,
  mutation,
  rsaPrivateJwk,
  signInRequest,
  url,
  verifyRequest,
} from './auth-fixture';
import { fixtureCollection } from './fixture-collection';
import { sqliteFixture } from './sqlite-fixture';

const closes: (() => void)[] = [];
afterEach(() => {
  for (const close of closes.splice(0)) close();
  vi.useRealTimers();
});

async function setup() {
  const h = await harness();
  const issuer = createAuthWorker();
  const catalog = createArchiveWorker([fixtureCollection]);
  const fixture = sqliteFixture();
  closes.push(
    () => h.db.sqlite.close(),
    () => fixture.database.close(),
  );
  const env: ArchiveWorkerEnv = {
    ALLOWED_ORIGINS: APP_ORIGIN,
    APP_ENV: 'local',
    AUTH_ISSUER_SERVICE: { fetch: (request) => issuer.fetch(request, h.env) },
    DB: fixture.binding,
    JWT_AUDIENCE: h.env.AUDIENCE,
    JWT_ISSUER: h.env.AUTH_ISSUER,
    JWT_JWKS_URL: url('/jwks.json'),
    LIKES_ENABLED: 'true',
    PUBLISHING_ENABLED: 'true',
    RATE_LIMIT_KEY_SECRET: 'local',
    READ_LIMIT: { limit: async () => ({ success: true }) },
    WRITE_LIMIT: { limit: async () => ({ success: true }) },
  };
  const config = apiConfig(env);
  config.jwks = createRemoteJWKSet(new URL(url('/jwks.json')), {
    [customFetch]: async () => issuer.fetch(new Request(url('/jwks.json')), h.env),
  });
  h.env.AUTH_ARCHIVE = {
    fetch: (request) => catalog.fetch(request, env, { waitUntil: () => undefined }),
  };
  const login = async (email = 'reader@example.test') => {
    expect((await issuer.fetch(signInRequest(email), h.env)).status).toBe(202);
    const response = await issuer.fetch(verifyRequest(lastLinkToken(h.sent)), h.env);
    expect(response.status).toBe(204);
    return cookiePair(response);
  };
  const call = (path: string, cookie: string, method = 'GET', body?: unknown, publisher?: string) =>
    catalog.fetch(
      new Request(`${APP_ORIGIN}/api/v1${path}`, {
        body: body === undefined ? undefined : JSON.stringify(body),
        headers: {
          'content-type': 'application/json',
          cookie,
          origin: APP_ORIGIN,
          'x-archive-request': '1',
          ...(publisher === undefined ? {} : { 'x-archive-publisher': publisher }),
        },
        method,
      }),
      env,
      { waitUntil: () => undefined },
    );
  const revoke = (cookie: string, account = decodeJwt(cookie.split('=')[1]).sub ?? '') =>
    issuer.fetch(mutation('/sign-out-all', { headers: { cookie, [ACCOUNT_HEADER]: account }, method: 'POST' }), h.env);
  return { ...h, ...fixture, authEnv: h.env, call, config, env, issuer, login, revoke };
}

describe('live session authority', () => {
  it('revokes two sessions and outstanding links, preserving the account and catalog data for fresh sign-in', async () => {
    const h = await setup();
    const first = await h.login();
    const second = await h.login();
    expect(second).not.toBe(first);
    expect(decodeJwt(first.split('=')[1]).sessionVersion).toBe(0);
    const registered = await h.call('/me', first, 'POST', { name: 'Reader' });
    const publisher = ((await registered.json()) as { id: string }).id;
    const published = await h.call(
      '/collections/fixture/entries',
      first,
      'POST',
      {
        clientKey: crypto.randomUUID(),
        payload: { v: 4 },
      },
      publisher,
    );
    expect(published.status).toBe(201);
    expect((await h.issuer.fetch(signInRequest('reader@example.test'), h.authEnv)).status).toBe(202);
    const oldLink = lastLinkToken(h.sent);
    const revoked = await h.revoke(first);
    expect(revoked.status).toBe(200);
    expect(archiveOkSchema.parse(await revoked.json())).toEqual({ ok: true });
    expect(revoked.headers.get('set-cookie')).toContain('Max-Age=0');
    for (const cookie of [first, second]) {
      expect((await h.call('/me', cookie)).status).toBe(401);
      expect((await h.call('/me/account', cookie, 'DELETE', undefined, publisher)).status).toBe(401);
      expect((await h.issuer.fetch(new Request(url('/account'), { headers: { cookie } }), h.authEnv)).status).toBe(401);
    }
    expect((await h.issuer.fetch(verifyRequest(oldLink), h.authEnv)).status).toBe(410);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 3_600_000);
    const fresh = await h.login();
    expect(decodeJwt(fresh.split('=')[1]).sessionVersion).toBe(1);
    expect((await h.call('/me', fresh)).status).toBe(200);
    expect(await (await h.call('/me', fresh)).json()).toMatchObject({ id: publisher, name: 'Reader' });
    expect(h.database.prepare('SELECT count(*) AS n FROM publications').get()).toEqual({ n: 1 });
    expect(h.db.sqlite.prepare('SELECT count(*) AS n FROM auth_users').get()).toEqual({ n: 1 });
  });

  it('checks account UUID, origin, marker and current account before revocation', async () => {
    const h = await setup();
    const cookie = await h.login();
    const other = await h.login('other@example.test');
    expect((await h.revoke(other, decodeJwt(cookie.split('=')[1]).sub)).status).toBe(409);
    expect((await h.revoke(cookie, 'bad')).status).toBe(400);
    expect(
      (await h.issuer.fetch(mutation('/sign-out-all', { headers: { cookie }, method: 'POST' }), h.authEnv)).status,
    ).toBe(400);
    expect(
      (await h.issuer.fetch(new Request(url('/sign-out-all'), { headers: { cookie }, method: 'POST' }), h.authEnv))
        .status,
    ).toBe(403);
    expect(
      (
        await h.issuer.fetch(
          mutation('/sign-out-all', { headers: { cookie, origin: 'http://evil.test' }, method: 'POST' }),
          h.authEnv,
        )
      ).status,
    ).toBe(403);
    expect(h.db.sqlite.prepare('SELECT sum(session_version) AS n FROM auth_users').get()).toEqual({ n: 0 });
  });

  it('rolls back version and link removal on durable failure and never clears the cookie', async () => {
    const h = await setup();
    const cookie = await h.login();
    await h.issuer.fetch(signInRequest('reader@example.test'), h.authEnv);
    const token = lastLinkToken(h.sent);
    h.db.sqlite.exec(`CREATE TRIGGER fail_revoke BEFORE DELETE ON auth_tokens
      BEGIN SELECT RAISE(ABORT, 'secret failure'); END;`);
    const failed = await h.revoke(cookie);
    expect(failed.status).toBe(500);
    expect(failed.headers.get('set-cookie')).toBeNull();
    expect(await failed.text()).not.toContain('secret failure');
    expect(h.db.sqlite.prepare('SELECT session_version FROM auth_users').get()).toEqual({ session_version: 0 });
    h.db.sqlite.exec('DROP TRIGGER fail_revoke');
    expect((await h.issuer.fetch(verifyRequest(token), h.authEnv)).status).toBe(204);
  });

  it('serializes concurrent revocations, accepting only one use of the old version', async () => {
    const h = await setup();
    const cookie = await h.login();
    const results = await Promise.all([h.revoke(cookie), h.revoke(cookie)]);
    expect(results.map((response) => response.status).sort()).toEqual([200, 401]);
    expect(h.db.sqlite.prepare('SELECT session_version FROM auth_users').get()).toEqual({ session_version: 1 });
  });

  it('fails closed at the safe version ceiling without wrapping or clearing the cookie', async () => {
    const h = await setup();
    const original = await h.login();
    h.db.sqlite.prepare('UPDATE auth_users SET session_version = ?').run(Number.MAX_SAFE_INTEGER);
    const key = await importJWK(JSON.parse(h.authEnv.AUTH_JWT_PRIVATE_JWK), 'RS256');
    const claims = decodeJwt(original.split('=')[1]);
    const token = await new SignJWT({ ...claims, sessionVersion: Number.MAX_SAFE_INTEGER })
      .setProtectedHeader({ alg: 'RS256' })
      .sign(key);
    const cookie = `archive_session=${token}`;
    const response = await h.revoke(cookie);
    expect(response.status).toBe(500);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(h.db.sqlite.prepare('SELECT session_version FROM auth_users').get()).toEqual({
      session_version: Number.MAX_SAFE_INTEGER,
    });
  });

  it('never upgrades a redemption racing revocation into unchecked fresh authority', async () => {
    const h = await setup();
    const cookie = await h.login();
    await h.issuer.fetch(signInRequest('reader@example.test'), h.authEnv);
    const token = lastLinkToken(h.sent);
    const [redemption, revoked] = await Promise.all([
      h.issuer.fetch(verifyRequest(token), h.authEnv),
      h.revoke(cookie),
    ]);
    expect(revoked.status).toBe(200);
    expect([204, 410]).toContain(redemption.status);
    if (redemption.status === 204) {
      const raced = cookiePair(redemption);
      expect(decodeJwt(raced.split('=')[1]).sessionVersion).toBe(0);
      expect((await h.call('/me', raced)).status).toBe(401);
    }
  });

  it('checks pending-erasure accounts at the issuer while catalog retry bypasses its live lookup and tombstone', async () => {
    const h = await setup();
    const cookie = await h.login();
    const account = decodeJwt(cookie.split('=')[1]).sub ?? '';
    const registered = await h.call('/me', cookie, 'POST', {});
    const publisher = ((await registered.json()) as { id: string }).id;
    const erase = () =>
      h.issuer.fetch(
        mutation('/account', {
          headers: { cookie, [ACCOUNT_HEADER]: account, 'x-archive-publisher': publisher },
          method: 'DELETE',
        }),
        h.authEnv,
      );
    h.db.failOn('DELETE FROM auth_users');
    expect((await erase()).status).toBe(500);
    expect((await h.call('/me', cookie)).status).toBe(401);
    h.env.AUTH_ISSUER_SERVICE = {
      fetch: async () => {
        throw new Error('must not recurse');
      },
    };
    expect((await erase()).status).toBe(204);
    expect((await erase()).status).toBe(401);
    expect((await h.call('/me', cookie, 'POST', {})).status).toBe(503);
    h.env.AUTH_ISSUER_SERVICE = { fetch: (request) => h.issuer.fetch(request, h.authEnv) };
    expect((await h.call('/me', cookie, 'POST', {})).status).toBe(401);
    expect(h.database.prepare('SELECT count(*) AS n FROM publishers').get()).toEqual({ n: 0 });
  });

  it.each([undefined, null, -1, 1.5, '0', Number.MAX_SAFE_INTEGER + 1])(
    'rejects malformed sessionVersion %s in both Workers',
    async (version) => {
      const h = await setup();
      const cookie = await h.login();
      const key = await importJWK(JSON.parse(h.authEnv.AUTH_JWT_PRIVATE_JWK), 'RS256');
      const original = decodeJwt(cookie.split('=')[1]);
      const { sessionVersion: _version, ...claims } = original;
      const token = await new SignJWT({ ...claims, ...(version === undefined ? {} : { sessionVersion: version }) })
        .setProtectedHeader({ alg: 'RS256' })
        .sign(key);
      const malformed = `archive_session=${token}`;
      expect(
        (await h.issuer.fetch(new Request(url('/session'), { headers: { cookie: malformed } }), h.authEnv)).status,
      ).toBe(401);
      await expect(
        verifySession(new Request(`${APP_ORIGIN}/api/v1/me`, { headers: { cookie: malformed } }), h.config, h.env),
      ).rejects.toMatchObject({ status: 401 });
    },
  );

  it('rejects a mismatched version and a deleted account without exposing account metadata', async () => {
    const h = await setup();
    const cookie = await h.login();
    const validate = () => h.issuer.fetch(new Request(url('/session'), { headers: { cookie } }), h.authEnv);
    const active = await validate();
    expect(await active.json()).toEqual({ ok: true });
    expect(active.headers.get('cache-control')).toBe('no-store');
    h.db.sqlite.exec('UPDATE auth_users SET session_version = 1');
    expect((await validate()).status).toBe(401);
    h.db.sqlite.exec('DELETE FROM auth_users');
    expect((await validate()).status).toBe(401);
    expect((await h.call('/me', cookie)).status).toBe(401);
  });

  it('revokes operator sessions and never caches a prior successful authority check', async () => {
    const h = await setup();
    const cookie = await h.login('op@example.test');
    const checked = vi.fn(h.env.AUTH_ISSUER_SERVICE.fetch);
    h.env.AUTH_ISSUER_SERVICE = { fetch: checked };
    expect((await h.call('/me', cookie)).status).toBe(200);
    expect((await h.call('/me', cookie)).status).toBe(200);
    expect(checked).toHaveBeenCalledTimes(2);
    expect((await h.revoke(cookie)).status).toBe(200);
    expect((await h.call('/me', cookie)).status).toBe(401);
    expect(checked).toHaveBeenCalledTimes(3);
  });

  it.each([
    [
      'validated invalid session',
      401,
      { error: { code: 'unauthenticated', message: 'Sign in.', requestId: '6f1d2c3a-1b2c-4d5e-8f90-123456789abc' } },
      401,
    ],
    ['malformed invalid session', 401, {}, 503],
    [
      'unrelated 401 code',
      401,
      { error: { code: 'forbidden', message: 'No.', requestId: '6f1d2c3a-1b2c-4d5e-8f90-123456789abc' } },
      503,
    ],
    [
      '401 with unexpected fields',
      401,
      {
        error: {
          code: 'unauthenticated',
          email: 'secret@example.test',
          message: 'Sign in.',
          requestId: '6f1d2c3a-1b2c-4d5e-8f90-123456789abc',
        },
      },
      503,
    ],
    [
      'provider error',
      500,
      { error: { code: 'internal', message: 'No.', requestId: '6f1d2c3a-1b2c-4d5e-8f90-123456789abc' } },
      503,
    ],
    ['unexpected status', 204, null, 503],
    ['malformed success', 200, { ok: false }, 503],
    ['unexpected private metadata', 200, { email: 'secret@example.test', ok: true }, 503],
  ] as const)('handles issuer %s strictly', async (_label, status, body, expected) => {
    const h = await setup();
    const cookie = await h.login();
    h.env.AUTH_ISSUER_SERVICE = {
      fetch: async () => (status === 204 ? new Response(null, { status }) : Response.json(body, { status })),
    };
    const response = await h.call('/me', cookie);
    expect(response.status).toBe(expected);
    expect(await response.json()).toMatchObject({
      error: { code: expected === 401 ? 'unauthenticated' : 'auth-unavailable' },
    });
  });

  it('treats malformed JSON and rejected providers as unavailable, not anonymous', async () => {
    const h = await setup();
    const cookie = await h.login();
    for (const provider of [
      async () => new Response('not-json'),
      async (): Promise<Response> => {
        throw new Error('private failure');
      },
    ]) {
      h.env.AUTH_ISSUER_SERVICE = { fetch: provider };
      const response = await h.call('/me', cookie);
      expect(response.status).toBe(503);
      expect(await response.text()).not.toContain('private failure');
    }
  });

  it('bounds hung provider requests and aborts them', async () => {
    const h = await setup();
    const cookie = await h.login();
    let signal: AbortSignal | null = null;
    let started: () => void = () => undefined;
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    h.env.AUTH_ISSUER_SERVICE = {
      fetch: (request) => {
        signal = request.signal;
        started();
        return new Promise<Response>(() => undefined);
      },
    };
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const pending = h.call('/me', cookie);
    await entered;
    await vi.runAllTimersAsync();
    expect((await pending).status).toBe(503);
    expect((signal as AbortSignal | null)?.aborted).toBe(true);
  });

  it('bounds stalled service-response decoding as well as the fetch itself', async () => {
    const h = await setup();
    const cookie = await h.login();
    let started: () => void = () => undefined;
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    h.env.AUTH_ISSUER_SERVICE = {
      fetch: async () => {
        started();
        return new Response(new ReadableStream({ start: () => undefined }));
      },
    };
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const pending = h.call('/me', cookie);
    await entered;
    await vi.runAllTimersAsync();
    expect((await pending).status).toBe(503);
  });

  it('bounds issuer-to-catalog erasure calls without deleting the account or clearing its cookie', async () => {
    const h = await setup();
    const cookie = await h.login();
    let started: () => void = () => undefined;
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    h.authEnv.AUTH_ARCHIVE = {
      fetch: () => {
        started();
        return new Promise<Response>(() => undefined);
      },
    };
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const pending = h.issuer.fetch(
      mutation('/account', {
        headers: { cookie, [ACCOUNT_HEADER]: decodeJwt(cookie.split('=')[1]).sub ?? '' },
        method: 'DELETE',
      }),
      h.authEnv,
    );
    await entered;
    await vi.runAllTimersAsync();
    const response = await pending;
    expect(response.status).toBe(503);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(h.db.sqlite.prepare('SELECT count(*) AS n FROM auth_users').get()).toEqual({ n: 1 });
  });

  it('keeps a live session distinct from an issuer database outage', async () => {
    const h = await setup();
    const cookie = await h.login();
    h.db.failOn('SELECT id, email');
    const response = await h.issuer.fetch(new Request(url('/session'), { headers: { cookie } }), h.authEnv);
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: { code: 'internal' } });
    h.db.failOn('SELECT id, email');
    expect((await h.call('/me', cookie)).status).toBe(503);
  });

  it('requires the explicit issuer binding even for an anonymous configured Worker', async () => {
    const h = await setup();
    expect(() => apiConfig({ ...h.env, AUTH_ISSUER_SERVICE: undefined } as unknown as ArchiveWorkerEnv)).toThrow();
  });
});

describe('issuer readiness', () => {
  it('returns a public sanitized, read-only health DTO and matching schema stamp without calling peers or email', async () => {
    const h = await setup();
    const events: AuthEvent[] = [];
    h.issuer.tap((event) => events.push(event));
    const response = await h.issuer.fetch(
      new Request(url('/health'), { headers: { cookie: 'archive_session=invalid' } }),
      h.authEnv,
    );
    expect(response.status).toBe(200);
    expect(archiveAuthHealthSchema.parse(await response.json())).toEqual({
      dbSchemaVersion: AUTH_SCHEMA_VERSION,
      reason: null,
      schemaVersion: AUTH_SCHEMA_VERSION,
      status: 'ok',
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(h.sent).toHaveLength(0);
    expect(h.archiveCalls).toHaveLength(0);
    expect(events.at(-1)).toMatchObject({ code: 'ok', route: '/auth/health', status: 200 });
  });

  it('reports configuration failure as a health DTO rather than an error envelope', async () => {
    const h = await setup();
    const response = await h.issuer.fetch(new Request(url('/health')), {
      ...h.authEnv,
      AUTH_JWT_PRIVATE_JWK: 'private invalid key',
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      dbSchemaVersion: null,
      reason: 'configuration-unavailable',
      schemaVersion: 1,
      status: 'degraded',
    });
  });

  it('rejects imported but inconsistent RSA signing material through readiness', async () => {
    const h = await setup();
    const key = JSON.parse(h.authEnv.AUTH_JWT_PRIVATE_JWK) as Record<string, unknown>;
    key.n = (await rsaPrivateJwk()).n;
    const response = await h.issuer.fetch(new Request(url('/health')), {
      ...h.authEnv,
      AUTH_JWT_PRIVATE_JWK: JSON.stringify(key),
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ reason: 'configuration-unavailable' });
  });

  it.each([
    'UPDATE auth_schema_meta SET applied = 99',
    'DELETE FROM auth_schema_meta',
    'DROP TABLE auth_link_budget',
    'ALTER TABLE auth_users RENAME COLUMN session_version TO wrong_version',
    'DROP TRIGGER auth_sessions_revoked',
  ])('reports unreadable or mismatched schema: %s', async (sql) => {
    const h = await setup();
    h.db.sqlite.exec(sql);
    const events: AuthEvent[] = [];
    h.issuer.tap((event) => events.push(event));
    const response = await h.issuer.fetch(new Request(url('/health')), h.authEnv);
    expect(response.status).toBe(503);
    expect(archiveAuthHealthSchema.parse(await response.json())).toMatchObject({
      reason: 'schema-mismatch',
      status: 'degraded',
    });
    expect(events.at(-1)).toMatchObject({ diagnostic: { kind: 'schema' }, route: '/auth/health', status: 503 });
  });

  it('sanitizes database failures and observes the correct health diagnostic', async () => {
    const h = await setup();
    const events: AuthEvent[] = [];
    h.issuer.tap((event) => events.push(event));
    h.db.failOn('PRAGMA table_info');
    const response = await h.issuer.fetch(new Request(url('/health')), h.authEnv);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ reason: 'database-unavailable', status: 'degraded' });
    expect(events.at(-1)).toMatchObject({ diagnostic: { kind: 'database' }, status: 503 });
  });

  it('pins singleton schema stamp and safe nonnegative session-version DDL constraints', async () => {
    const h = await setup();
    await h.login();
    expect(h.db.sqlite.prepare('SELECT applied FROM auth_schema_meta WHERE id = 1').get()).toEqual({
      applied: AUTH_SCHEMA_VERSION,
    });
    expect(() => h.db.sqlite.exec('INSERT INTO auth_schema_meta VALUES (2, 1)')).toThrow();
    for (const value of [-1, Number.MAX_SAFE_INTEGER + 1, 1.5]) {
      expect(() => h.db.sqlite.prepare('UPDATE auth_users SET session_version = ?').run(value)).toThrow();
    }
  });
});

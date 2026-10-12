import { s } from '@vielzeug/spell';
import { createRemoteJWKSet, customFetch, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineArchiveCollection } from '../collection';
import { ARCHIVE_OPERATOR_ROLE, OPERATOR_SESSION_MAX_AGE_SECONDS, SESSION_MAX_AGE_SECONDS } from '../contract';
import { JWT_CLOCK_TOLERANCE_SECONDS, verifySession } from '../worker/auth';
import { type ArchiveWorkerEnv, apiConfig } from '../worker/env';
import { deleteAccountProfile } from '../worker/publications';
import { type ArchiveEvent, createArchiveWorker } from '../worker/worker';
import { fixtureCollection } from './fixture-collection';
import { sqliteFixture } from './sqlite-fixture';

const fixtures: ReturnType<typeof sqliteFixture>[] = [];
afterEach(() => {
  for (const fixture of fixtures.splice(0)) fixture.database.close();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function setup() {
  const fixture = sqliteFixture();
  fixtures.push(fixture);
  const env: ArchiveWorkerEnv = {
    ALLOWED_ORIGINS: 'http://localhost:5173',
    APP_ENV: 'local',
    AUTH_ISSUER_SERVICE: { fetch: async () => Response.json({ ok: true }) },
    DB: fixture.binding,
    JWT_AUDIENCE: 'archive',
    JWT_ISSUER: 'http://localhost:8930',
    JWT_JWKS_URL: 'http://localhost:8930/jwks',
    LIKES_ENABLED: 'true',
    PUBLISHING_ENABLED: 'true',
    RATE_LIMIT_KEY_SECRET: 'local',
    READ_LIMIT: { limit: async () => ({ success: true }) },
    WRITE_LIMIT: { limit: async () => ({ success: true }) },
  };
  const worker = createArchiveWorker([fixtureCollection]);
  const events: ArchiveEvent[] = [];
  worker.tap((event) => events.push(event));
  const tasks: Promise<unknown>[] = [];
  const ctx = {
    waitUntil: (task: Promise<unknown>) => {
      tasks.push(task);
    },
  };
  return { ...fixture, ctx, env, events, tasks, worker };
}

const req = (path: string, headers?: HeadersInit) => new Request(`http://localhost:5173/api/v1${path}`, { headers });

describe('readiness and diagnostics', () => {
  it('reports a broken collection callback as a sanitized server failure', async () => {
    const { env, ctx, database } = setup();
    const ownerId = crypto.randomUUID();
    const entryId = crypto.randomUUID();
    const at = new Date().toISOString();
    database
      .prepare('INSERT INTO publishers(id, issuer, subject, created_at) VALUES (?, ?, ?, ?)')
      .run(ownerId, 'issuer', 'subject', at);
    database
      .prepare(`INSERT INTO publications
        (id, owner_id, collection, client_key, schema_version, content_version,
         payload_json, content_hash, title, tags_json, published_at, updated_at)
        VALUES (?, ?, 'broken', ?, 1, 1, '{"v":4}', ?, 'Title', '[]', ?, ?)`)
      .run(entryId, ownerId, crypto.randomUUID(), 'a'.repeat(64), at, at);
    const collection = defineArchiveCollection({
      contentVersion: 1,
      index: () => ({ filter: null, tags: [], title: 'Title' }),
      name: 'broken',
      payloadSchema: s.object({
        v: s.number().check((): boolean => {
          throw new Error('Private deployment details');
        }),
      }),
    });
    const worker = createArchiveWorker([collection]);
    const events: ArchiveEvent[] = [];
    worker.tap((event) => events.push(event));
    const response = await worker.fetch(req(`/collections/broken/entries/${entryId}`), env, ctx);
    expect(response.status).toBe(500);
    expect(events.at(-1)).toMatchObject({ code: 'internal', diagnostic: { kind: 'collection' }, status: 500 });
    const body = await response.text();
    expect(body).toContain('"code":"internal"');
    expect(body).not.toContain('Private deployment details');
  });

  it('retains revocation through both issuance and verification clock-skew allowances', async () => {
    const { env } = setup();
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const keys = { keys: [await exportJWK(publicKey)] };
    const jwks = createRemoteJWKSet(new URL('http://localhost:8930/jwks'), {
      [customFetch]: async () => new Response(JSON.stringify(keys)),
    });
    const config = { ...apiConfig(env), jwks };
    const erasedAt = Math.floor(Date.now() / 1000) * 1000;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(erasedAt);
    const issuedAt = erasedAt / 1000 + JWT_CLOCK_TOLERANCE_SECONDS;
    const token = await new SignJWT({ sessionVersion: 0 })
      .setProtectedHeader({ alg: 'RS256' })
      .setSubject('clock-skew')
      .setIssuer(config.issuer)
      .setAudience(config.audience)
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + SESSION_MAX_AGE_SECONDS)
      .sign(privateKey);
    const request = req('/me', { cookie: `archive_session=${token}` });
    const session = await verifySession(request, config, env);
    if (session === null) throw new Error('Missing signed session');
    await deleteAccountProfile(env, session);
    vi.setSystemTime(erasedAt + (SESSION_MAX_AGE_SECONDS + JWT_CLOCK_TOLERANCE_SECONDS + 1) * 1000);
    expect(await verifySession(request, config, env, true)).not.toBeNull();
    await expect(verifySession(request, config, env)).rejects.toMatchObject({ status: 401 });
  });

  it('accepts short operator sessions but rejects long-lived authority claims', async () => {
    const { env } = setup();
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const keys = { keys: [await exportJWK(publicKey)] };
    const jwks = createRemoteJWKSet(new URL('http://localhost:8930/jwks'), {
      [customFetch]: async () => new Response(JSON.stringify(keys)),
    });
    const config = { ...apiConfig(env), jwks };
    const sign = (operator: boolean, age: number) =>
      new SignJWT({ sessionVersion: 0, ...(operator ? { roles: [ARCHIVE_OPERATOR_ROLE] } : {}) })
        .setProtectedHeader({ alg: 'RS256' })
        .setSubject('operator')
        .setIssuer(config.issuer)
        .setAudience(config.audience)
        .setIssuedAt()
        .setExpirationTime(`${age}s`)
        .sign(privateKey);
    const short = await sign(true, OPERATOR_SESSION_MAX_AGE_SECONDS);
    expect(await verifySession(req('/me', { cookie: `archive_session=${short}` }), config, env)).toMatchObject({
      operator: true,
    });
    const long = await sign(true, SESSION_MAX_AGE_SECONDS);
    await expect(verifySession(req('/me', { cookie: `archive_session=${long}` }), config, env)).rejects.toMatchObject({
      status: 401,
    });
    const regular = await sign(false, SESSION_MAX_AGE_SECONDS);
    expect(await verifySession(req('/me', { cookie: `archive_session=${regular}` }), config, env)).toMatchObject({
      operator: false,
    });
    const session = await verifySession(req('/me', { cookie: `archive_session=${regular}` }), config, env);
    if (session === null) throw new Error('Missing signed session');
    await deleteAccountProfile(env, session);
    await expect(
      verifySession(req('/me', { cookie: `archive_session=${regular}` }), config, env),
    ).rejects.toMatchObject({ status: 401 });
    const retry = await verifySession(req('/me/account', { cookie: `archive_session=${regular}` }), config, env, true);
    expect(retry).toMatchObject({ publisher: null, subject: session.subject });
    if (retry === null) throw new Error('Missing erasure retry session');
    expect((await deleteAccountProfile(env, retry)).status).toBe(204);
  });

  it('distinguishes an unavailable database from a mismatched schema and answers 503', async () => {
    const { database, env, worker, events, ctx } = setup();
    database.exec('UPDATE archive_schema_meta SET applied = 99');
    const mismatched = await worker.fetch(req('/health'), env, ctx);
    expect(mismatched.status).toBe(503);
    expect(await mismatched.json()).toMatchObject({
      dbSchemaVersion: 99,
      reason: 'schema-mismatch',
      status: 'degraded',
    });
    expect(events.at(-1)).toMatchObject({ diagnostic: { kind: 'schema' }, status: 503 });
    const unavailable = await worker.fetch(
      req('/health'),
      {
        ...env,
        DB: {
          batch: async () => {
            throw new Error('outage');
          },
          prepare: () => {
            throw new Error('SQL and sensitive information');
          },
        },
      },
      ctx,
    );
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toMatchObject({ dbSchemaVersion: null, reason: 'database-unavailable' });
    expect(events.at(-1)).toMatchObject({ diagnostic: { kind: 'database' }, status: 503 });
  });

  it('reports sanitized configuration details only to taps', async () => {
    const { env, worker, events, ctx } = setup();
    const response = await worker.fetch(req('/health'), { ...env, JWT_AUDIENCE: '' }, ctx);
    expect(response.status).toBe(503);
    expect(events.at(-1)).toMatchObject({ diagnostic: { field: 'JWT_AUDIENCE', kind: 'configuration' } });
    expect(await response.text()).not.toContain('JWT_AUDIENCE');
  });

  it('observes and rethrows scheduled database failures', async () => {
    const { env, worker, events, ctx } = setup();
    const outage = new Error('private failure detail');
    if (worker.scheduled === undefined) throw new Error('Missing scheduled handler');
    await expect(
      worker.scheduled(
        undefined,
        {
          ...env,
          DB: {
            batch: async () => [],
            prepare: () => {
              throw outage;
            },
          },
        },
        ctx,
      ),
    ).rejects.toBe(outage);
    expect(events.at(-1)).toEqual({ diagnostic: { kind: 'database' }, status: 'failed', type: 'scheduled' });
  });

  it('never subscribes a pre-aborted tap and detaches manually unsubscribed taps', async () => {
    const { env, worker, ctx } = setup();
    const aborted = new AbortController();
    aborted.abort();
    const inactive = vi.fn();
    worker.tap(inactive, { signal: aborted.signal });
    const callback = vi.fn();
    const controller = new AbortController();
    const off = worker.tap(callback, { signal: controller.signal });
    off();
    await worker.fetch(req('/health'), env, ctx);
    controller.abort();
    expect(inactive).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
  });
});

describe('anonymous list-only caching', () => {
  it('keeps signed list reads and every detail response no-store', async () => {
    const { env, worker, ctx } = setup();
    const match = vi.fn(async () => undefined);
    const put = vi.fn(async () => {});
    vi.stubGlobal('caches', { default: { match, put } });
    for (const headers of [
      new Headers({ cookie: 'archive_session=invalid' }),
      new Headers({ authorization: 'Bearer invalid' }),
    ]) {
      const signed = await worker.fetch(req('/collections/fixture/entries', headers), env, ctx);
      expect(signed.status).toBe(200);
      expect(signed.headers.get('cache-control')).toBe('no-store');
    }
    const missing = await worker.fetch(req(`/collections/fixture/entries/${crypto.randomUUID()}`), env, ctx);
    expect(missing.status).toBe(404);
    expect(missing.headers.get('cache-control')).toBe('no-store');
    expect(match).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    const anonymous = await worker.fetch(req('/collections/fixture/entries'), env, ctx);
    expect(anonymous.headers.get('cache-control')).toBe('public, max-age=30, s-maxage=30');
    expect(put).toHaveBeenCalledOnce();
  });

  it('observes cache faults without turning successful list reads into failures', async () => {
    const { env, worker, ctx, events, tasks } = setup();
    vi.stubGlobal('caches', {
      default: {
        match: async () => {
          throw new Error('cache read failed');
        },
        put: async () => {
          throw new Error('cache write failed');
        },
      },
    });
    const response = await worker.fetch(req('/collections/fixture/entries'), env, ctx);
    await Promise.all(tasks);
    expect(response.status).toBe(200);
    expect(events.filter((event) => event.type === 'cache-error')).toEqual([
      { diagnostic: { kind: 'cache' }, type: 'cache-error' },
      { diagnostic: { kind: 'cache' }, type: 'cache-error' },
    ]);
  });
});

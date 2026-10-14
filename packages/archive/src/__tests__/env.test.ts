import { exportJWK, generateKeyPair, jwtVerify, SignJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ArchiveWorkerEnv, apiConfig, type D1Like, type RateLimiterBinding } from '../worker/env';
import { ApiError } from '../worker/http';

/** The rate-limit bindings the config validates but never calls here. */
const limiter: RateLimiterBinding = { limit: async () => ({ success: true }) };

/** A fresh env object per test: config results are cached per bindings object. */
const env = (overrides: Partial<ArchiveWorkerEnv> = {}): ArchiveWorkerEnv => ({
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
  RATE_LIMIT_KEY_SECRET: 'short-local-pepper',
  READ_LIMIT: limiter,
  WRITE_LIMIT: limiter,
  ...overrides,
});

/** A production-shaped env: HTTPS origins, non-loopback issuer. */
const productionEnv = (secret: string | undefined): ArchiveWorkerEnv =>
  env({
    ALLOWED_ORIGINS: 'https://app.example.com',
    APP_ENV: 'production',
    JWT_ISSUER: 'https://issuer.example.com',
    JWT_JWKS_URL: 'https://issuer.example.com/jwks',
    ...(secret === undefined ? { RATE_LIMIT_KEY_SECRET: '' } : { RATE_LIMIT_KEY_SECRET: secret }),
  });

afterEach(() => vi.restoreAllMocks());

describe('apiConfig signing-key transport', () => {
  it('verifies sessions using signing keys fetched through the issuer service binding', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const signingKey = { ...(await exportJWK(publicKey)), alg: 'RS256', kid: 'issuer-key', use: 'sig' };
    const globalFetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Same-zone fetch is unavailable'));
    const issuerFetch = vi.fn<(request: Request) => Promise<Response>>(async () =>
      Response.json({ keys: [signingKey] }),
    );
    const bindings = {
      ...productionEnv('a'.repeat(32)),
      AUTH_ISSUER_SERVICE: { fetch: issuerFetch },
    };
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'issuer-key' })
      .setIssuer(bindings.JWT_ISSUER)
      .setAudience(bindings.JWT_AUDIENCE)
      .setSubject('verified-account')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);

    const result = await jwtVerify(token, apiConfig(bindings).jwks, {
      algorithms: ['RS256'],
      audience: bindings.JWT_AUDIENCE,
      issuer: bindings.JWT_ISSUER,
    });

    expect(result.payload.sub).toBe('verified-account');
    expect(globalFetch).not.toHaveBeenCalled();
    expect(issuerFetch).toHaveBeenCalledOnce();
    const [request] = issuerFetch.mock.calls[0];
    expect(request.url).toBe(bindings.JWT_JWKS_URL);
    expect(request.method).toBe('GET');
    expect(request.headers.has('cookie')).toBe(false);
    expect(request.redirect).toBe('manual');
  });
});

describe('apiConfig rate-limit pepper', () => {
  it('falls back to the insecure local pepper in local development', () => {
    expect(apiConfig(env({ RATE_LIMIT_KEY_SECRET: '' })).rateLimitPepper).toBe('dev-only-insecure-pepper');
  });

  it('uses the configured pepper in local development', () => {
    expect(apiConfig(env()).rateLimitPepper).toBe('short-local-pepper');
  });

  it('fails closed in production without a secret', () => {
    let thrown: unknown;
    try {
      apiConfig(productionEnv(undefined));
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ApiError);
    expect(thrown).toMatchObject({ code: 'unavailable', status: 503 });
  });

  it('fails closed in production with a secret shorter than 32 characters', () => {
    let thrown: unknown;
    try {
      apiConfig(productionEnv('a'.repeat(31)));
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ApiError);
    expect(thrown).toMatchObject({ code: 'unavailable', status: 503 });
  });

  it('accepts a 32-character production secret', () => {
    expect(apiConfig(productionEnv('a'.repeat(32))).rateLimitPepper).toBe('a'.repeat(32));
  });
});

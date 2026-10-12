import { describe, expect, it } from 'vitest';
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

import { createRemoteJWKSet, customFetch } from 'jose';
import { ApiError } from './http';

/**
 * Worker configuration. Every value the worker trusts comes from the validated Env —
 * never from request-supplied URLs or headers. Anything missing or malformed fails
 * closed (503) rather than falling back to a permissive default.
 */
export type AppEnv = 'local' | 'production';

export interface ApiConfig {
  allowedOrigins: ReadonlySet<string>;
  appEnv: AppEnv;
  audience: string;
  issuer: string;
  jwks: ReturnType<typeof createRemoteJWKSet>;
  likesEnabled: boolean;
  publishingEnabled: boolean;
  rateLimitPepper: string;
}

/** The rate-limit binding subset the core calls; the runtime's RateLimit satisfies it. */
export interface RateLimiterBinding {
  limit(input: { key: string }): Promise<{ success: boolean }>;
}

/** The D1 statement subset the core binds; null params model nullable columns. */
export interface D1Statement {
  all<T>(): Promise<{ results?: T[] }>;
  bind(...params: (string | number | null)[]): D1Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta?: { changes?: number } }>;
}

/** The D1 database subset the core uses; a deployment's generated D1Database satisfies it. */
export interface D1Like {
  batch(statements: D1Statement[]): Promise<{ meta?: { changes?: number } }[]>;
  prepare(sql: string): D1Statement;
}

/**
 * The bindings the archive Worker reads. The package declares its own minimal
 * structural types instead of `@cloudflare/workers-types`: a deployment's generated
 * Env (with real D1Database/RateLimit bindings) satisfies this shape structurally.
 */
export interface ArchiveWorkerEnv {
  ALLOWED_ORIGINS: string;
  APP_ENV: string;
  /** Required issuer session-validation service; every private request checks live authority. */
  AUTH_ISSUER_SERVICE: AuthIssuerServiceBinding;
  DB: D1Like;
  JWT_AUDIENCE: string;
  JWT_ISSUER: string;
  JWT_JWKS_URL: string;
  LIKES_ENABLED: string;
  PUBLISHING_ENABLED: string;
  RATE_LIMIT_KEY_SECRET: string;
  READ_LIMIT: RateLimiterBinding;
  WRITE_LIMIT: RateLimiterBinding;
}

export interface AuthIssuerServiceBinding {
  fetch(request: Request): Promise<Response>;
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

const isLoopback = (url: URL): boolean => LOOPBACK_HOSTS.has(url.hostname);

// Configuration faults never name the offending field — the response must not
// leak Env names or framework details, only a generic temporary unavailability.
const configError = (field: string): ApiError =>
  new ApiError(503, 'unavailable', 'The service is temporarily unavailable.', {
    diagnostic: { field, kind: 'configuration' },
  });

const requireVar = (env: ArchiveWorkerEnv, name: string): string => {
  const value = env[name as keyof ArchiveWorkerEnv];
  if (typeof value !== 'string' || value.length === 0) throw configError(name);
  return value;
};

const requireUrl = (raw: string, name: string): URL => {
  try {
    return new URL(raw);
  } catch {
    throw configError(name);
  }
};

/** Validates one trusted endpoint URL against the environment's transport rules. */
const validateUrl = (url: URL, appEnv: AppEnv, name: string): URL => {
  // No embedded credentials or fragments can ever be part of a trusted endpoint.
  if (url.username !== '' || url.password !== '' || url.hash !== '') throw configError(name);
  if (appEnv === 'local') {
    // Loopback HTTP is permitted only in local development.
    if (url.protocol !== 'http:' || !isLoopback(url)) throw configError(name);
    return url;
  }
  if (url.protocol !== 'https:' || isLoopback(url)) throw configError(name);
  return url;
};

/**
 * An allowed origin is an exact canonical origin: scheme + host (+port) and
 * nothing else — no wildcard, `null` origin, credentials, path, query or fragment.
 * Local permits loopback HTTP; production requires non-loopback HTTPS.
 */
const validateOrigin = (raw: string, appEnv: AppEnv, name: string): string => {
  if (raw === 'null' || raw === '*') throw configError(name);
  const url = validateUrl(requireUrl(raw, name), appEnv, name);
  if (url.pathname !== '/' || url.search !== '') throw configError(name);
  const canonical = url.origin;
  if (canonical !== raw) throw configError(name);
  return canonical;
};

const flag = (raw: string, name: string): boolean => {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw configError(name);
};

/** Local-only fallback pepper for rate-limit keys; never a production secret. */
const DEV_RATE_LIMIT_PEPPER = 'dev-only-insecure-pepper';

/**
 * The deployment secret behind rate-limit key HMACs: a deployment-specific
 * pepper makes the hashed keys useless outside this deployment. Production
 * fails closed on a missing, empty or too-short value; local development only
 * may fall back to the constant insecure pepper — local only, never production.
 */
const rateLimitPepperFor = (env: ArchiveWorkerEnv, appEnv: AppEnv): string => {
  const raw = env.RATE_LIMIT_KEY_SECRET;
  if (typeof raw !== 'string' || raw.length === 0) {
    if (appEnv === 'local') return DEV_RATE_LIMIT_PEPPER;
    throw configError('RATE_LIMIT_KEY_SECRET');
  }
  if (appEnv === 'production' && raw.length < 32) throw configError('RATE_LIMIT_KEY_SECRET');
  return raw;
};

const configs = new WeakMap<ArchiveWorkerEnv, ApiConfig>();

/** Parses and validates the env once per bindings object; throws ApiError(503). */
export function apiConfig(env: ArchiveWorkerEnv): ApiConfig {
  const cached = configs.get(env);
  if (cached) return cached;

  const appEnvRaw = requireVar(env, 'APP_ENV');
  if (appEnvRaw !== 'local' && appEnvRaw !== 'production') throw configError('APP_ENV');
  const appEnv = appEnvRaw;

  // The issuer URL is validated for transport/safety but kept as the exact
  // configured string for JWT claim matching.
  validateUrl(requireUrl(requireVar(env, 'JWT_ISSUER'), 'JWT_ISSUER'), appEnv, 'JWT_ISSUER');
  const jwksUrl = validateUrl(requireUrl(requireVar(env, 'JWT_JWKS_URL'), 'JWT_JWKS_URL'), appEnv, 'JWT_JWKS_URL');
  const audience = requireVar(env, 'JWT_AUDIENCE');

  const origins = new Set(
    requireVar(env, 'ALLOWED_ORIGINS')
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0)
      .map((o) => validateOrigin(o, appEnv, 'ALLOWED_ORIGINS')),
  );
  if (origins.size === 0) throw configError('ALLOWED_ORIGINS');

  if (typeof env.DB?.prepare !== 'function' || typeof env.DB?.batch !== 'function') throw configError('DB');
  if (typeof env.READ_LIMIT?.limit !== 'function') throw configError('READ_LIMIT');
  if (typeof env.WRITE_LIMIT?.limit !== 'function') throw configError('WRITE_LIMIT');
  if (typeof env.AUTH_ISSUER_SERVICE?.fetch !== 'function') throw configError('AUTH_ISSUER_SERVICE');

  const config: ApiConfig = {
    allowedOrigins: origins,
    appEnv,
    audience,
    // The exact configured issuer string is the match target — a trailing slash
    // is meaningful, never normalized away.
    issuer: requireVar(env, 'JWT_ISSUER'),
    jwks: createRemoteJWKSet(jwksUrl, {
      [customFetch]: (input, init) => env.AUTH_ISSUER_SERVICE.fetch(new Request(input, init)),
    }),
    likesEnabled: flag(requireVar(env, 'LIKES_ENABLED'), 'LIKES_ENABLED'),
    publishingEnabled: flag(requireVar(env, 'PUBLISHING_ENABLED'), 'PUBLISHING_ENABLED'),
    rateLimitPepper: rateLimitPepperFor(env, appEnv),
  };
  configs.set(env, config);
  return config;
}

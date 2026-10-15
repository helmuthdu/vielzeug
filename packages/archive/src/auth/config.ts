import {
  type CryptoKey,
  calculateJwkThumbprint,
  createLocalJWKSet,
  importJWK,
  type JWK_RSA_Private,
  type JWK_RSA_Public,
  jwtVerify,
  SignJWT,
} from 'jose';
import type { D1Like } from '../worker/env';
import type { ApiError } from '../worker/http';
import { AuthOperationError } from './errors';

/** The send-email binding subset the issuer calls; the runtime's SendEmail satisfies it. */
export interface SendEmail {
  send(message: { from: string; html?: string; subject: string; text: string; to: string }): Promise<unknown>;
}

/**
 * The catalog Worker as the issuer reaches it: a Cloudflare service binding (or any
 * `fetch`-shaped stub). Account erasure calls the catalog's `DELETE /api/v1/me/account`
 * through it before removing the issuer's own row.
 */
export interface AuthArchiveBinding {
  fetch(request: Request): Promise<Response>;
}

/**
 * The bindings the auth issuer reads. Declared structurally, like the catalog
 * Worker's Env: a deployment's generated `ExportedHandler<Env>` accepts the factory's
 * result as-is, with no `@cloudflare/workers-types` dependency. Every value is
 * validated on first use per bindings object; a missing or malformed one answers
 * 503 `unavailable` on every route, never a permissive fallback.
 */
export interface AuthWorkerEnv {
  /** Comma-separated exact origins allowed to call unsafe routes and read CORS responses. */
  ALLOWED_ORIGINS: string;
  /** Exactly `local` (loopback HTTP only) or `production` (non-loopback HTTPS, Secure cookies). */
  APP_ENV: string;
  /** The app's display name in magic-link email and escaped confirmation-page branding. */
  APP_NAME: string;
  AUDIENCE: string;
  /** Service binding to the sibling catalog Worker: account erasure removes the catalog profile through it. */
  AUTH_ARCHIVE: AuthArchiveBinding;
  /** The issuer's own D1: accounts, links, per-account send and singleton admission budgets. */
  AUTH_DB: D1Like;
  AUTH_EMAIL: SendEmail;
  /** The `iss` claim every token carries, exactly as the catalog Worker's `JWT_ISSUER` knows it. */
  AUTH_ISSUER: string;
  /**
   * Optional JWKS JSON (`{"keys":[...]}`) of retired PUBLIC RS256 keys, still served
   * from `/jwks.json` and accepted by the issuer so sessions minted before a rotation
   * keep verifying until they expire. Private members are rejected.
   */
  AUTH_JWT_PREVIOUS_PUBLIC_JWKS?: string;
  /** The active RS256 private key as a JWK JSON string (a wrangler secret): signs every new session. */
  AUTH_JWT_PRIVATE_JWK: string;
  /** Comma-separated emails whose sessions carry the operator role claim. */
  OPERATOR_EMAILS: string;
  /** The app's public origin: magic links, app recovery, signed-in navigation and catalog erasure point here. */
  PUBLIC_ORIGIN: string;
  /** The address emails come from: a domain onboarded to Cloudflare Email Service. */
  SENDER_ADDRESS: string;
}

export type AuthAppEnv = 'local' | 'production';

export interface PublicSigningKey extends JWK_RSA_Public {
  alg: 'RS256';
  kid: string;
  kty: 'RSA';
  use: 'sig';
}

export interface AuthConfig {
  allowedOrigins: ReadonlySet<string>;
  appEnv: AuthAppEnv;
  appName: string;
  audience: string;
  issuer: string;
  /** Every key a session may be verified with: the active key first, then retired ones. */
  jwks: readonly PublicSigningKey[];
  operatorEmails: ReadonlySet<string>;
  publicOrigin: string;
  senderAddress: string;
  signing: { key: CryptoKey; kid: string };
  verifier: ReturnType<typeof createLocalJWKSet>;
}

// Configuration faults never name the offending field: the response must not leak
// Env names, only a generic temporary unavailability.
const configError = (): ApiError => new AuthOperationError(503, 'configuration');

const EMAIL_MAX = 320;
const APP_NAME_MAX = 64;
// 2048-bit RSA modulus: 256 bytes, 342 base64url characters unpadded.
const MIN_MODULUS_CHARS = 342;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const PRIVATE_RSA_MEMBERS = ['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth', 'k'] as const;

export const isWellFormedEmail = (value: string): boolean =>
  value.length <= EMAIL_MAX &&
  value === value.toLowerCase() &&
  /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/.test(value);

const requireString = (value: unknown): string => {
  if (typeof value !== 'string' || value.length === 0) throw configError();
  return value;
};

const requireBinding = (value: unknown, method: string): void => {
  if (typeof value !== 'object' || value === null) throw configError();
  if (typeof Reflect.get(value, method) !== 'function') throw configError();
};

/** Transport rules: local is loopback HTTP only, production is non-loopback HTTPS; no credentials or fragments. */
const validateUrl = (raw: string, appEnv: AuthAppEnv): URL => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw configError();
  }
  if (url.username !== '' || url.password !== '' || url.hash !== '') throw configError();
  const loopback = LOOPBACK_HOSTS.has(url.hostname);
  if (appEnv === 'local' ? url.protocol !== 'http:' || !loopback : url.protocol !== 'https:' || loopback) {
    throw configError();
  }
  return url;
};

/** An exact canonical origin: scheme + host (+port), no path, query, wildcard or `null`. */
const validateOrigin = (raw: string, appEnv: AuthAppEnv): string => {
  const url = validateUrl(raw, appEnv);
  if (url.pathname !== '/' || url.search !== '' || url.origin !== raw) throw configError();
  return url.origin;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    throw configError();
  }
};

const b64urlMember = (jwk: Record<string, unknown>, name: string): string => {
  const value = jwk[name];
  if (typeof value !== 'string' || !BASE64URL.test(value)) throw configError();
  return value;
};

/** RS256 signing-key metadata, when present, must agree with how the issuer uses the key. */
const checkRsaMetadata = (jwk: Record<string, unknown>): void => {
  if (jwk.kty !== 'RSA') throw configError();
  if (jwk.alg !== undefined && jwk.alg !== 'RS256') throw configError();
  if (jwk.use !== undefined && jwk.use !== 'sig') throw configError();
};

const publicMembers = (jwk: Record<string, unknown>): JWK_RSA_Public => {
  const n = b64urlMember(jwk, 'n');
  if (n.length < MIN_MODULUS_CHARS) throw configError();
  return { e: b64urlMember(jwk, 'e'), kty: 'RSA', n };
};

const toSigningKey = async (pub: JWK_RSA_Public): Promise<PublicSigningKey> => ({
  alg: 'RS256',
  e: pub.e,
  kid: await calculateJwkThumbprint({ e: pub.e, kty: 'RSA', n: pub.n }),
  kty: 'RSA',
  n: pub.n,
  use: 'sig',
});

async function activeKey(raw: string): Promise<{ key: CryptoKey; public: PublicSigningKey }> {
  const parsed = parseJson(raw);
  if (!isRecord(parsed)) throw configError();
  checkRsaMetadata(parsed);
  const pub = publicMembers(parsed);
  const jwk: JWK_RSA_Private = {
    ...pub,
    d: b64urlMember(parsed, 'd'),
    dp: b64urlMember(parsed, 'dp'),
    dq: b64urlMember(parsed, 'dq'),
    p: b64urlMember(parsed, 'p'),
    q: b64urlMember(parsed, 'q'),
    qi: b64urlMember(parsed, 'qi'),
  };
  let key: CryptoKey;
  try {
    const imported = await importJWK(jwk, 'RS256', { extractable: false });
    if (imported instanceof Uint8Array) throw configError();
    key = imported;
  } catch {
    throw configError();
  }
  return { key, public: await toSigningKey(pub) };
}

/** Retired verification keys: public RSA members only; any private member is a misconfiguration. */
async function previousKeys(raw: string | undefined): Promise<PublicSigningKey[]> {
  if (raw === undefined || raw.trim().length === 0) return [];
  const parsed = parseJson(raw);
  if (!isRecord(parsed) || !Array.isArray(parsed.keys)) throw configError();
  const keys: PublicSigningKey[] = [];
  for (const entry of parsed.keys) {
    if (!isRecord(entry)) throw configError();
    checkRsaMetadata(entry);
    if (PRIVATE_RSA_MEMBERS.some((member) => member in entry)) throw configError();
    keys.push(await toSigningKey(publicMembers(entry)));
  }
  return keys;
}

const configs = new WeakMap<AuthWorkerEnv, Promise<AuthConfig>>();

async function buildConfig(env: AuthWorkerEnv): Promise<AuthConfig> {
  const appEnvRaw = requireString(env.APP_ENV);
  if (appEnvRaw !== 'local' && appEnvRaw !== 'production') throw configError();
  const appEnv: AuthAppEnv = appEnvRaw;

  const allowedOrigins = new Set(
    requireString(env.ALLOWED_ORIGINS)
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0)
      .map((origin) => validateOrigin(origin, appEnv)),
  );
  if (allowedOrigins.size === 0) throw configError();

  const publicOrigin = validateOrigin(requireString(env.PUBLIC_ORIGIN), appEnv);
  // The issuer is matched as the exact configured string (a trailing slash is meaningful).
  const issuer = requireString(env.AUTH_ISSUER);
  validateUrl(issuer, appEnv);
  const audience = requireString(env.AUDIENCE);
  const appName = requireString(env.APP_NAME);
  if (appName.length > APP_NAME_MAX || /[\p{Cc}\p{Cs}]/u.test(appName)) throw configError();
  const senderAddress = requireString(env.SENDER_ADDRESS);
  if (!isWellFormedEmail(senderAddress)) throw configError();
  if (typeof env.OPERATOR_EMAILS !== 'string') throw configError();
  const operatorEmails = new Set(
    env.OPERATOR_EMAILS.split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0),
  );
  for (const email of operatorEmails) if (!isWellFormedEmail(email)) throw configError();

  requireBinding(env.AUTH_DB, 'prepare');
  requireBinding(env.AUTH_DB, 'batch');
  requireBinding(env.AUTH_EMAIL, 'send');
  requireBinding(env.AUTH_ARCHIVE, 'fetch');

  const active = await activeKey(requireString(env.AUTH_JWT_PRIVATE_JWK));
  try {
    const proof = await new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: active.public.kid }).sign(active.key);
    await jwtVerify(proof, createLocalJWKSet({ keys: [active.public] }), { algorithms: ['RS256'] });
  } catch {
    throw configError();
  }
  const retired = (await previousKeys(env.AUTH_JWT_PREVIOUS_PUBLIC_JWKS)).filter(
    (key) => key.kid !== active.public.kid,
  );
  const jwks = [
    active.public,
    ...retired.filter((key, i) => retired.findIndex((other) => other.kid === key.kid) === i),
  ];

  return {
    allowedOrigins,
    appEnv,
    appName,
    audience,
    issuer,
    jwks,
    operatorEmails,
    publicOrigin,
    senderAddress,
    signing: { key: active.key, kid: active.public.kid },
    verifier: createLocalJWKSet({ keys: [...jwks] }),
  };
}

/**
 * Validates the env and imports its keys once per bindings object. A failed
 * validation is not cached, so a corrected binding set recovers without a restart.
 */
export function authConfig(env: AuthWorkerEnv): Promise<AuthConfig> {
  const cached = configs.get(env);
  if (cached !== undefined) return cached;
  const pending = buildConfig(env);
  configs.set(env, pending);
  pending.catch(() => configs.delete(env));
  return pending;
}

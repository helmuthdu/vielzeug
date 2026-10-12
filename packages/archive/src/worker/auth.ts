import { errors, type JWTPayload, jwtVerify } from 'jose';
import {
  ARCHIVE_OPERATOR_ROLE,
  archiveErrorResponseSchema,
  archiveOkSchema,
  isWellFormedText,
  OPERATOR_SESSION_MAX_AGE_SECONDS,
  SESSION_MAX_AGE_SECONDS,
} from '../contract';
import { serviceRequest } from './_service';
import type { ApiConfig, ArchiveWorkerEnv } from './env';
import { ApiError, sessionToken, unauthenticated } from './http';
import { SQL } from './sql';

/**
 * Session authentication. The Worker trusts exactly one source: the archive_session
 * HttpOnly cookie holding an RS256 JWT from the configured issuer. Tokens are verified
 * before any database read and are never echoed into DTOs; the publisher row maps the
 * opaque (issuer, subject) pair to the public publisher id. An optional `roles` claim
 * from the same trusted issuer grants operator authority (moderation routes).
 */
export interface VerifiedSubject {
  issuer: string;
  subject: string;
}

export interface Publisher {
  displayName: string;
  id: string;
}

export interface Session {
  /** True only when the verified token's `roles` claim carries the operator role. */
  operator: boolean;
  /** The registered publisher row; null while the verified user has not registered. */
  publisher: Publisher | null;
  subject: VerifiedSubject;
}

const JWT_MAX_AGE_SECONDS = SESSION_MAX_AGE_SECONDS;
export const JWT_CLOCK_TOLERANCE_SECONDS = 5;
const SUBJECT_MAX_CHARS = 256;

const authUnavailable = (): ApiError => new ApiError(503, 'auth-unavailable', 'Sign-in is currently unavailable.');

/**
 * Verifies the session cookie; returns null for anonymous requests.
 * Token/signature/claim problems are 401; JWKS provider faults (fetch failure,
 * timeout, undecodable document) are 503 `auth-unavailable` — an outage is not a
 * reason to treat the caller as signed out.
 */
export async function verifySession(
  request: Request,
  config: ApiConfig,
  env: ArchiveWorkerEnv,
  allowErasureRetry = false,
): Promise<Session | null> {
  const token = sessionToken(request);
  if (token === null) return null;

  let payload: JWTPayload;
  try {
    const result = await jwtVerify(token, config.jwks, {
      algorithms: ['RS256'],
      audience: config.audience,
      clockTolerance: JWT_CLOCK_TOLERANCE_SECONDS,
      issuer: config.issuer,
      maxTokenAge: JWT_MAX_AGE_SECONDS,
      requiredClaims: ['sub', 'iss', 'aud', 'iat', 'exp', 'sessionVersion'],
    });
    payload = result.payload;
  } catch (error) {
    // Provider faults are 503: a JWKS outage must never read as a signed-out user.
    if (
      error instanceof errors.JWKSTimeout ||
      error instanceof errors.JWKSInvalid ||
      error instanceof errors.JWKSMultipleMatchingKeys
    ) {
      throw authUnavailable();
    }
    // Everything else in the JOSE family — malformed, expired, wrong alg/aud/iss,
    // bad signature, no matching key — is a token problem.
    if (error instanceof errors.JOSEError) throw unauthenticated();
    // Network fetch failures surface outside the JOSE error family.
    throw authUnavailable();
  }
  const subject = payload.sub;
  const issuer = payload.iss;
  const iat = payload.iat;
  const roles = payload.roles;
  if (!Number.isSafeInteger(payload.sessionVersion) || (payload.sessionVersion as number) < 0) throw unauthenticated();
  // Least authority: a malformed roles claim grants nothing, and operator authority
  // only ever comes from this verified, audience- and issuer-checked token.
  const operator = Array.isArray(roles) && roles.includes(ARCHIVE_OPERATOR_ROLE);
  // Malformed subjects must reject outright: lone surrogates/control characters
  // could otherwise collapse distinct claims into the same stored identity.
  if (
    typeof subject !== 'string' ||
    subject.length === 0 ||
    subject.length > SUBJECT_MAX_CHARS ||
    !isWellFormedText(subject)
  ) {
    throw unauthenticated();
  }
  if (typeof issuer !== 'string') throw unauthenticated();
  // A token claiming to be issued in the future beyond clock tolerance is a claims failure.
  if (typeof iat === 'number' && iat * 1000 > Date.now() + JWT_CLOCK_TOLERANCE_SECONDS * 1000) {
    throw unauthenticated();
  }
  if (
    operator &&
    (typeof iat !== 'number' ||
      typeof payload.exp !== 'number' ||
      payload.exp - iat > OPERATOR_SESSION_MAX_AGE_SECONDS ||
      Date.now() / 1000 - iat > OPERATOR_SESSION_MAX_AGE_SECONDS + JWT_CLOCK_TOLERANCE_SECONDS)
  )
    throw unauthenticated();

  // Only a previously tombstoned principal can bypass live validation to finish
  // partial erasure. Its profile cannot be re-created while the tombstone lives.
  const erasureRetry =
    allowErasureRetry && (await env.DB.prepare(SQL.revokedSubject).bind(issuer, subject, Date.now()).first()) !== null;
  if (!erasureRetry) {
    try {
      await serviceRequest(
        env.AUTH_ISSUER_SERVICE,
        new Request(new URL('/api/v1/auth/session', config.issuer), {
          headers: { cookie: `archive_session=${token}` },
          redirect: 'manual',
        }),
        async (response) => {
          const body: unknown = await response.json();
          if (response.status === 200 && archiveOkSchema.safeParse(body).success) return;
          const failure = archiveErrorResponseSchema.safeParse(body);
          if (response.status === 401 && failure.success && failure.data.error.code === 'unauthenticated')
            throw unauthenticated();
          throw authUnavailable();
        },
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) throw error;
      throw authUnavailable();
    }
  }
  if (!allowErasureRetry) {
    const revoked = await env.DB.prepare(SQL.revokedSubject).bind(issuer, subject, Date.now()).first();
    if (revoked !== null) throw unauthenticated();
  }
  const row = await env.DB.prepare(SQL.publisher).bind(issuer, subject).first<{
    display_name: string;
    id: string;
  }>();
  return {
    operator,
    publisher: row === null ? null : { displayName: row.display_name, id: row.id },
    subject: { issuer, subject },
  };
}

/** Session required for private routes; anonymous gets 401. */
export function requireSession(session: Session | null): Session {
  if (session === null) throw unauthenticated();
  return session;
}

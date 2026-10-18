import { errors, jwtVerify, SignJWT } from 'jose';
import { sha256Hex } from '../_crypto';
import {
  ACCOUNT_HEADER,
  ARCHIVE_OPERATOR_ROLE,
  type ArchiveErrorCode,
  AUTH_SCHEMA_VERSION,
  archiveAuthHealthSchema,
  archiveErrorResponseSchema,
  isWellFormedText,
  OPERATOR_SESSION_MAX_AGE_SECONDS,
  PUBLISHER_HEADER,
  REQUEST_MARKER_HEADER,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  sessionCookieValue,
  uuidSchema,
} from '../contract';
import { serviceRequest } from '../worker/_service';
import {
  ApiError,
  badRequest,
  expiredSessionCookie,
  forbidden,
  json,
  noStore,
  queryParams,
  readJsonBody,
  sessionToken,
  toErrorResponse,
  unauthenticated,
} from '../worker/http';
import type { ArchiveExecutionContext } from '../worker/worker';
import { confirmationPage, escapeHtml } from './_confirmation';
import { type AuthConfig, type AuthWorkerEnv, authConfig, isWellFormedEmail } from './config';
import { type AuthDiagnostic, AuthOperationError } from './errors';
import {
  authReadiness,
  consumeToken,
  deleteAccount,
  deleteToken,
  ensureUser,
  insertToken,
  LINK_TTL_MS,
  readAccount,
  revokeSessions,
  spendLinkBudget,
  spendSignInBudget,
  sweep,
} from './store';

/**
 * The reference identity issuer: passwordless email accounts. A POST with an email
 * address ensures the account row and sends a single-use magic link; consuming it
 * signs the browser in by setting the `archive_session` cookie a catalog Worker
 * verifies — an RS256 JWT minted by the active private key, verifiable through
 * `/jwks.json` alongside any configured retired public keys. `OPERATOR_EMAILS` is
 * the one operator-membership truth; operator sessions expire after one hour,
 * bounding authority from previously minted role claims. The account routes export the issuer's
 * own record and erase it together with the catalog profile.
 */
export interface AuthWorkerHandler<E extends AuthWorkerEnv = AuthWorkerEnv> {
  fetch(request: Request, env: E, ctx?: ArchiveExecutionContext): Promise<Response>;
  /** The cron sweep: expired links, closed send windows and never-verified accounts. */
  scheduled(controller: unknown, env: E, ctx?: ArchiveExecutionContext): Promise<void>;
  tap(handler: (event: AuthEvent) => void, options?: { readonly signal?: AbortSignal }): () => void;
}

export type AuthEvent =
  | {
      readonly type: 'request';
      readonly requestId: string;
      readonly route:
        | '/auth/account'
        | '/auth/jwks.json'
        | '/auth/sign-in'
        | '/auth/verify'
        | '/auth/session'
        | '/auth/sign-out-all'
        | '/auth/health'
        | 'unmatched';
      readonly status: number;
      readonly code: ArchiveErrorCode | 'ok';
      readonly ms: number;
      readonly diagnostic?: AuthDiagnostic;
    }
  | { readonly type: 'scheduled'; readonly status: 'ok'; readonly removed: number }
  | { readonly type: 'scheduled'; readonly status: 'failed'; readonly diagnostic: AuthDiagnostic };

const ROUTES = {
  account: /^\/api\/v1\/auth\/account$/,
  health: /^\/api\/v1\/auth\/health$/,
  jwks: /^\/api\/v1\/auth\/jwks\.json$/,
  session: /^\/api\/v1\/auth\/session$/,
  signIn: /^\/api\/v1\/auth\/sign-in$/,
  signOutAll: /^\/api\/v1\/auth\/sign-out-all$/,
  verify: /^\/api\/v1\/auth\/verify$/,
} as const;

const ROUTE_METHODS: Record<keyof typeof ROUTES, readonly string[]> = {
  account: ['GET', 'DELETE'],
  health: ['GET'],
  jwks: ['GET'],
  session: ['GET'],
  signIn: ['POST'],
  signOutAll: ['POST'],
  verify: ['GET', 'POST'],
};

const ROUTE_LABELS = {
  account: '/auth/account',
  health: '/auth/health',
  jwks: '/auth/jwks.json',
  session: '/auth/session',
  signIn: '/auth/sign-in',
  signOutAll: '/auth/sign-out-all',
  verify: '/auth/verify',
} as const;

const matchRoute = (request: Request): keyof typeof ROUTES | undefined =>
  (Object.keys(ROUTES) as (keyof typeof ROUTES)[]).find((id) => ROUTES[id].test(new URL(request.url).pathname));

const TOKEN_BYTES = 32;
// Base64url of TOKEN_BYTES random bytes, unpadded.
const LINK_TOKEN = /^[A-Za-z0-9_-]{43}$/;
const PUBLISHER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SUBJECT_MAX = 256;
const CLOCK_TOLERANCE_SECONDS = 5;

const randomToken = (): string =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(TOKEN_BYTES))))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');

const unavailable = (): ApiError => new AuthOperationError(503, 'catalog');

/** Exact allowed Origin plus the request marker, like the catalog's mutation guard. */
function requireMutationGuard(request: Request, config: AuthConfig, allowPublicOrigin = false): string {
  const origin = request.headers.get('origin');
  if (origin === null || (!config.allowedOrigins.has(origin) && !(allowPublicOrigin && origin === config.publicOrigin)))
    throw forbidden();
  if (request.headers.get(REQUEST_MARKER_HEADER) !== '1') throw forbidden();
  return origin;
}

function corsHeaders(request: Request, config: AuthConfig): Record<string, string> {
  const origin = request.headers.get('origin');
  if (
    origin === null ||
    (!config.allowedOrigins.has(origin) && !(matchRoute(request) === 'verify' && origin === config.publicOrigin))
  )
    return {};
  return { 'access-control-allow-credentials': 'true', 'access-control-allow-origin': origin, vary: 'Origin' };
}

function preflight(request: Request, config: AuthConfig, methods: readonly string[]): Response {
  const cors = corsHeaders(request, config);
  if (Object.keys(cors).length === 0) throw forbidden();
  return new Response(null, {
    headers: {
      ...cors,
      'access-control-allow-headers': `Content-Type, ${ACCOUNT_HEADER}, ${PUBLISHER_HEADER}, ${REQUEST_MARKER_HEADER}`,
      'access-control-allow-methods': [...methods, 'OPTIONS'].join(', '),
      'access-control-max-age': '600',
    },
    status: 204,
  });
}

const secure = (config: AuthConfig): boolean => config.appEnv === 'production';

async function mintSession(
  config: AuthConfig,
  subject: string,
  operator: boolean,
  sessionVersion: number,
): Promise<{ maxAge: number; token: string }> {
  const maxAge = operator ? OPERATOR_SESSION_MAX_AGE_SECONDS : SESSION_MAX_AGE_SECONDS;
  const token = await new SignJWT({ sessionVersion, ...(operator ? { roles: [ARCHIVE_OPERATOR_ROLE] } : {}) })
    .setProtectedHeader({ alg: 'RS256', kid: config.signing.kid, typ: 'JWT' })
    .setIssuedAt()
    .setJti(crypto.randomUUID())
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setSubject(subject)
    .setExpirationTime(`${maxAge}s`)
    .sign(config.signing.key);
  return { maxAge, token };
}

/** Verifies the request's own session cookie against every published key; returns the token and subject. */
async function requireSession(
  request: Request,
  config: AuthConfig,
  env: AuthWorkerEnv,
): Promise<{ subject: string; token: string; sessionVersion: number }> {
  const token = sessionToken(request);
  if (token === null) throw unauthenticated();
  try {
    const { payload } = await jwtVerify(token, config.verifier, {
      algorithms: ['RS256'],
      audience: config.audience,
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
      issuer: config.issuer,
      maxTokenAge: SESSION_MAX_AGE_SECONDS,
      requiredClaims: ['sub', 'iss', 'aud', 'iat', 'exp', 'sessionVersion'],
    });
    const subject = payload.sub ?? '';
    if (subject.length === 0 || subject.length > SUBJECT_MAX || !isWellFormedText(subject)) throw unauthenticated();
    const version = payload.sessionVersion;
    if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0) throw unauthenticated();
    if (typeof payload.iat !== 'number' || payload.iat > Date.now() / 1000 + CLOCK_TOLERANCE_SECONDS)
      throw unauthenticated();
    if (
      Array.isArray(payload.roles) &&
      payload.roles.includes(ARCHIVE_OPERATOR_ROLE) &&
      (typeof payload.exp !== 'number' ||
        payload.exp - payload.iat > OPERATOR_SESSION_MAX_AGE_SECONDS ||
        Date.now() / 1000 - payload.iat > OPERATOR_SESSION_MAX_AGE_SECONDS + CLOCK_TOLERANCE_SECONDS)
    )
      throw unauthenticated();
    const account = await readAccount(env.AUTH_DB, subject);
    if (account === null || account.session_version !== version) throw unauthenticated();
    return { sessionVersion: version, subject, token };
  } catch (error) {
    if (error instanceof errors.JOSEError) throw unauthenticated();
    throw error;
  }
}

async function sendLink(env: AuthWorkerEnv, config: AuthConfig, to: string, link: string): Promise<void> {
  const name = config.appName;
  const minutes = LINK_TTL_MS / 60_000;
  const notice = `The link works once and expires in ${minutes} minutes. If you did not request it, ignore this email.`;
  await env.AUTH_EMAIL.send({
    from: config.senderAddress,
    html: `<p>Open this link to sign in to ${escapeHtml(name)}:</p><p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p><p>${notice}</p>`,
    subject: `Your ${name} sign-in link`,
    text: `Open this link to sign in to ${name}:\n\n${link}\n\n${notice}`,
    to,
  });
}

async function handleSignIn(request: Request, env: AuthWorkerEnv, config: AuthConfig): Promise<Response> {
  requireMutationGuard(request, config);
  const body = await readJsonBody(request);
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw badRequest();
  const keys = Object.keys(body);
  const requestedEmail: unknown = Reflect.get(body, 'email');
  if (keys.length !== 1 || keys[0] !== 'email' || typeof requestedEmail !== 'string') {
    throw badRequest();
  }
  const email = requestedEmail.trim().toLowerCase();
  if (!isWellFormedEmail(email)) {
    throw badRequest();
  }
  const nowMs = Date.now();
  const admissionRetry = await spendSignInBudget(env.AUTH_DB, nowMs);
  if (admissionRetry !== null) {
    throw new ApiError(429, 'rate-limited', 'Too many sign-in requests. Try again later.', {
      retryAfterSeconds: admissionRetry,
    });
  }
  const user = await ensureUser(env.AUTH_DB, email);
  const retryAfterSeconds = await spendLinkBudget(env.AUTH_DB, user.id, nowMs);
  if (retryAfterSeconds !== null) {
    throw new ApiError(429, 'rate-limited', 'Too many sign-in emails. Try again later.', { retryAfterSeconds });
  }
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  await insertToken(env.AUTH_DB, tokenHash, user.id, nowMs);
  try {
    await sendLink(env, config, user.email, `${config.publicOrigin}/api/v1/auth/verify?token=${token}`);
  } catch (error) {
    // An unsent link is useless; the spent allowance is deliberately not refunded.
    await deleteToken(env.AUTH_DB, tokenHash).catch(() => undefined);
    throw new AuthOperationError(503, 'email', { cause: error });
  }
  return json(202, { ok: true }, noStore);
}

async function handleVerify(request: Request, env: AuthWorkerEnv, config: AuthConfig): Promise<Response> {
  if (request.method === 'GET') {
    const token = queryParams(new URL(request.url), ['token']).get('token') ?? '';
    if (!LINK_TOKEN.test(token)) throw badRequest('The link is not valid.');
    return confirmationPage({ ...config, nonce: randomToken(), token });
  }
  requireMutationGuard(request, config, true);
  queryParams(new URL(request.url), []);
  const body = await readJsonBody(request);
  if (typeof body !== 'object' || body === null || Array.isArray(body) || Object.keys(body).length !== 1) {
    throw badRequest('The link is not valid.');
  }
  const token: unknown = Reflect.get(body, 'token');
  if (typeof token !== 'string') throw badRequest('The link is not valid.');
  if (!LINK_TOKEN.test(token)) throw badRequest('The link is not valid.');
  const user = await consumeToken(env.AUTH_DB, await sha256Hex(token), Date.now());
  if (user === null) throw new ApiError(410, 'gone', 'That link has expired or was already used.');
  const session = await mintSession(config, user.id, config.operatorEmails.has(user.email), user.sessionVersion);
  return new Response(null, {
    headers: {
      ...noStore,
      'set-cookie': sessionCookieValue(session.token, { maxAgeSeconds: session.maxAge, secure: secure(config) }),
    },
    status: 204,
  });
}

/** The issuer's half of a complete export: the account record only, never tokens or budget state. */
async function handleExport(request: Request, env: AuthWorkerEnv, config: AuthConfig): Promise<Response> {
  const { subject } = await requireSession(request, config, env);
  const row = await readAccount(env.AUTH_DB, subject);
  if (row === null) throw unauthenticated();
  return json(
    200,
    { createdAt: row.created_at, email: row.email, id: row.id, lastSignInAt: row.last_sign_in_at },
    noStore,
  );
}

/** Re-serializes a failed catalog response into the public envelope; anything unrecognizable is 503. */
async function archiveFailure(response: Response): Promise<Response> {
  const text = await response.text().catch(() => '');
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  const envelope = archiveErrorResponseSchema.safeParse(parsed);
  if (!envelope.success || response.status < 400 || response.status > 599) throw unavailable();
  const { code, message, requestId } = envelope.data.error;
  const retryAfter = response.headers.get('retry-after');
  return json(
    response.status,
    { error: { code, message, requestId } },
    retryAfter !== null && /^\d{1,6}$/.test(retryAfter) ? { ...noStore, 'retry-after': retryAfter } : noStore,
  );
}

/**
 * Full erasure: catalog session revocation and profile erasure first (through the AUTH_ARCHIVE service binding,
 * presenting the caller's own session), then the issuer's account row, and only then
 * the cookie is expired. Any failure keeps the browser session so the same request
 * can be retried; both halves are idempotent, so a retry after a partial success
 * re-runs the catalog no-op and finishes the issuer side. The account precondition
 * pins every attempt to the confirmed issuer subject, even without a publisher.
 */
async function handleErase(request: Request, env: AuthWorkerEnv, config: AuthConfig): Promise<Response> {
  const origin = requireMutationGuard(request, config);
  const { subject, token } = await requireSession(request, config, env);
  const account = request.headers.get(ACCOUNT_HEADER);
  if (account === null || !uuidSchema.safeParse(account).success) throw badRequest();
  if (account !== subject) {
    throw new ApiError(409, 'account-changed', 'The signed-in account changed since this request was prepared.');
  }
  const headers = new Headers({
    cookie: `${SESSION_COOKIE_NAME}=${token}`,
    origin,
    [REQUEST_MARKER_HEADER]: '1',
  });
  const publisher = request.headers.get(PUBLISHER_HEADER);
  if (publisher !== null) {
    if (!PUBLISHER_ID.test(publisher)) throw badRequest();
    headers.set(PUBLISHER_HEADER, publisher);
  }
  let archived: Response;
  try {
    archived = await serviceRequest(
      env.AUTH_ARCHIVE,
      new Request(`${config.publicOrigin}/api/v1/me/account`, { headers, method: 'DELETE', redirect: 'manual' }),
      async (response) => {
        if (response.status === 204) {
          await response.body?.cancel();
          return response;
        }
        return archiveFailure(response);
      },
    );
  } catch (error) {
    throw new AuthOperationError(503, 'catalog', { cause: error });
  }
  if (archived.status !== 204) return archived;
  await deleteAccount(env.AUTH_DB, subject);
  return new Response(null, {
    headers: { ...noStore, 'set-cookie': expiredSessionCookie(secure(config)) },
    status: 204,
  });
}

async function handleSignOutAll(request: Request, env: AuthWorkerEnv, config: AuthConfig): Promise<Response> {
  requireMutationGuard(request, config);
  const { subject, sessionVersion } = await requireSession(request, config, env);
  const account = request.headers.get(ACCOUNT_HEADER);
  if (account === null || !uuidSchema.safeParse(account).success) throw badRequest();
  if (account !== subject)
    throw new ApiError(409, 'account-changed', 'The signed-in account changed since this request was prepared.');
  if ((await revokeSessions(env.AUTH_DB, subject, sessionVersion)) === null) throw unauthenticated();
  return json(200, { ok: true }, { ...noStore, 'set-cookie': expiredSessionCookie(secure(config)) });
}

async function handleHealth(env: AuthWorkerEnv): Promise<Response> {
  let reason: 'configuration-unavailable' | 'database-unavailable' | 'schema-mismatch' | null = null;
  let dbSchemaVersion: number | null = null;
  try {
    await authConfig(env);
  } catch {
    reason = 'configuration-unavailable';
  }
  if (reason === null) {
    try {
      dbSchemaVersion = await authReadiness(env.AUTH_DB);
      if (dbSchemaVersion !== AUTH_SCHEMA_VERSION) reason = 'schema-mismatch';
    } catch {
      reason = 'database-unavailable';
    }
  }
  return json(
    reason === null ? 200 : 503,
    archiveAuthHealthSchema.parse({
      dbSchemaVersion,
      reason,
      schemaVersion: AUTH_SCHEMA_VERSION,
      status: reason === null ? 'ok' : 'degraded',
    }),
    noStore,
  );
}
async function route(request: Request, env: AuthWorkerEnv): Promise<Response> {
  const method = request.method.toUpperCase();
  const routeId = matchRoute(request);
  if (routeId === undefined) throw new ApiError(404, 'not-found', 'No such route.');
  if (routeId === 'health' && method === 'GET') return handleHealth(env);
  const config = await authConfig(env);
  const cors = corsHeaders(request, config);
  if (method === 'OPTIONS') return preflight(request, config, ROUTE_METHODS[routeId]);
  if (!ROUTE_METHODS[routeId].includes(method)) {
    throw new ApiError(405, 'method-not-allowed', 'That method is not allowed here.');
  }
  let response: Response;
  switch (routeId) {
    case 'health':
      response = await handleHealth(env);
      break;
    case 'session':
      await requireSession(request, config, env);
      response = json(200, { ok: true }, noStore);
      break;
    case 'signOutAll':
      response = await handleSignOutAll(request, env, config);
      break;
    case 'jwks':
      response = json(200, { keys: config.jwks }, noStore);
      break;
    case 'signIn':
      response = await handleSignIn(request, env, config);
      break;
    case 'verify':
      response = await handleVerify(request, env, config);
      break;
    case 'account':
      response = method === 'GET' ? await handleExport(request, env, config) : await handleErase(request, env, config);
      break;
  }
  return withCors(response, cors);
}

function withCors(response: Response, cors: Record<string, string>): Response {
  if (Object.keys(cors).length === 0) return response;
  const next = new Response(response.body, response);
  for (const [key, value] of Object.entries(cors)) next.headers.set(key, value);
  return next;
}

const diagnostic = (error: unknown): AuthDiagnostic =>
  error instanceof AuthOperationError ? error.authDiagnostic : { kind: 'internal' };

/**
 * Builds the reference identity issuer. Route behavior is fixed; every deployment
 * difference is validated configuration — the app name, trusted origins, audience and
 * issuer claims, signing keys, operator roster, the catalog service binding, and
 * where links and redirects land.
 */
export function createAuthWorker<E extends AuthWorkerEnv>(): AuthWorkerHandler<E> {
  const tappers = new Set<(event: AuthEvent) => void>();
  const emit = (event: AuthEvent): void => {
    for (const handler of tappers) {
      try {
        handler(event);
      } catch {
        // Observers never change request or scheduled outcomes.
      }
    }
  };
  return {
    async fetch(request: Request, env: E): Promise<Response> {
      const requestId = crypto.randomUUID();
      const started = Date.now();
      let response: Response;
      let failure: unknown;
      try {
        response = await route(request, env);
      } catch (error) {
        failure = error;
        response = toErrorResponse(error, requestId);
        // Failures stay readable by allowed origins; config faults have no trusted origin set.
        const config = await authConfig(env).catch(() => null);
        if (config !== null) {
          if (
            matchRoute(request) === 'verify' &&
            request.method === 'GET' &&
            error instanceof ApiError &&
            error.status === 400
          )
            response = confirmationPage({ ...config, nonce: randomToken(), token: null });
          response = withCors(response, corsHeaders(request, config));
        }
      }
      if (matchRoute(request) === 'verify') {
        response.headers.set('cache-control', 'no-store');
        response.headers.set('referrer-policy', 'no-referrer');
        response.headers.set('x-content-type-options', 'nosniff');
        if (!response.headers.has('content-security-policy')) {
          response.headers.set(
            'content-security-policy',
            "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
          );
        }
      }
      if (tappers.size > 0) {
        const routeId = matchRoute(request);
        const code =
          response.status < 400
            ? 'ok'
            : routeId === 'health'
              ? 'unavailable'
              : failure instanceof ApiError
                ? failure.code
                : 'internal';
        // Account erasure may forward a catalog error response rather than throw.
        const forwardedCode =
          failure === undefined && response.status >= 400
            ? archiveErrorResponseSchema.safeParse(
                await response
                  .clone()
                  .json()
                  .catch(() => null),
              )
            : null;
        const health =
          routeId === 'health' && response.status === 503
            ? archiveAuthHealthSchema.safeParse(
                await response
                  .clone()
                  .json()
                  .catch(() => null),
              )
            : null;
        emit({
          code: forwardedCode?.success ? forwardedCode.data.error.code : code,
          ms: Math.max(0, Date.now() - started),
          requestId,
          route: routeId === undefined ? 'unmatched' : ROUTE_LABELS[routeId],
          status: response.status,
          type: 'request',
          ...(response.status >= 500
            ? {
                diagnostic: health?.success
                  ? {
                      kind:
                        health.data.reason === 'configuration-unavailable'
                          ? 'configuration'
                          : health.data.reason === 'schema-mismatch'
                            ? 'schema'
                            : 'database',
                    }
                  : failure === undefined
                    ? { kind: 'catalog' as const }
                    : diagnostic(failure),
              }
            : {}),
        });
      }
      return response;
    },

    async scheduled(_controller: unknown, env: E): Promise<void> {
      try {
        await authConfig(env);
        const removed = await sweep(env.AUTH_DB, Date.now());
        if (tappers.size > 0) emit({ removed, status: 'ok', type: 'scheduled' });
      } catch (error) {
        if (tappers.size > 0) emit({ diagnostic: diagnostic(error), status: 'failed', type: 'scheduled' });
        throw error;
      }
    },
    tap(handler, options) {
      if (options?.signal?.aborted) return () => undefined;
      const observer = (event: AuthEvent): void => handler(event);
      const unsubscribe = (): void => {
        tappers.delete(observer);
        options?.signal?.removeEventListener('abort', unsubscribe);
      };
      tappers.add(observer);
      options?.signal?.addEventListener('abort', unsubscribe, { once: true });
      return unsubscribe;
    },
  };
}

import {
  ARCHIVE_LIMITS,
  type ArchiveErrorCode,
  PUBLISHER_HEADER,
  REQUEST_MARKER_HEADER,
  SESSION_COOKIE_NAME,
  sessionCookieValue,
} from '../contract';
import type { ApiConfig } from './env';

/**
 * HTTP plumbing shared by every route: the one error shape, bounded body reads, strict
 * query/header guards and the CORS contract. Handlers throw ApiError; the entry point
 * sanitizes — no stack, SQL, body, or PII ever reaches a response. Internal to the
 * Worker: clients parse the wire envelope (`archiveErrorResponseSchema`), never this class.
 */
export class ApiError extends Error {
  readonly code: ArchiveErrorCode;
  readonly retryAfterSeconds?: number;
  readonly status: number;
  readonly diagnostic?: ArchiveDiagnostic;
  constructor(
    status: number,
    code: ArchiveErrorCode,
    message: string,
    opts?: ErrorOptions & { retryAfterSeconds?: number; diagnostic?: ArchiveDiagnostic },
  ) {
    super(message, opts);
    this.name = 'ApiError';
    this.code = code;
    this.retryAfterSeconds = opts?.retryAfterSeconds;
    this.status = status;
    this.diagnostic = opts?.diagnostic;
  }
}

export type ArchiveDiagnostic =
  | { readonly kind: 'configuration'; readonly field: string }
  | { readonly kind: 'database' | 'record' | 'schema' | 'internal' | 'cache' | 'collection' };

export const badRequest = (message = 'The request is not valid.'): ApiError =>
  new ApiError(400, 'bad-request', message);
export const unauthenticated = (): ApiError => new ApiError(401, 'unauthenticated', 'Sign-in is required.');
export const forbidden = (message = 'That action is not allowed.'): ApiError => new ApiError(403, 'forbidden', message);
export const notFound = (): ApiError => new ApiError(404, 'not-found', 'No such entry.');
export const conflict = (message = 'The entry changed since you saw it.'): ApiError =>
  new ApiError(409, 'conflict', message);
export const invalid = (message = 'The payload is not valid.'): ApiError =>
  new ApiError(422, 'invalid-payload', message);

export const json = (status: number, body: unknown, headers: HeadersInit = {}): Response =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
    status,
  });

export const noStore = { 'cache-control': 'no-store' } as const;

export const errorBody = (status: number, code: string, message: string, requestId: string): Response =>
  json(status, { error: { code, message, requestId } }, noStore);

/** Sanitizes any thrown value into the public error shape; unknowns become 500. */
export function toErrorResponse(error: unknown, requestId: string): Response {
  if (error instanceof ApiError) {
    const headers: HeadersInit =
      error.retryAfterSeconds === undefined ? noStore : { ...noStore, 'retry-after': String(error.retryAfterSeconds) };
    return json(error.status, { error: { code: error.code, message: error.message, requestId } }, headers);
  }
  return errorBody(500, 'internal', 'Something went wrong.', requestId);
}

/**
 * Rejects query strings with unknown or repeated parameters. Every accepted route
 * names its full allow-list; anything else is a client bug, not something to ignore.
 * Keys listed in `repeatable` may carry several values (read back with `getAll`);
 * every other key stays single-valued.
 */
export function queryParams(url: URL, allowed: readonly string[], repeatable: readonly string[] = []): URLSearchParams {
  const params = url.searchParams;
  const seen = new Set<string>();
  for (const key of params.keys()) {
    if (!allowed.includes(key) || (seen.has(key) && !repeatable.includes(key))) throw badRequest();
    seen.add(key);
  }
  return params;
}

/** Exact-origin plus request-marker guard for every mutation: no wildcards, no nulls. */
export function requireMutationGuard(request: Request, config: ApiConfig): void {
  const origin = request.headers.get('origin');
  if (origin === null || !config.allowedOrigins.has(origin)) throw forbidden();
  if (request.headers.get(REQUEST_MARKER_HEADER) !== '1') throw forbidden();
}

/** CORS response headers for one already-allowed origin; absent for foreign origins. */
export function corsHeaders(request: Request, config: ApiConfig): Record<string, string> {
  const origin = request.headers.get('origin');
  if (origin === null || !config.allowedOrigins.has(origin)) return {};
  return {
    'access-control-allow-credentials': 'true',
    'access-control-allow-origin': origin,
    vary: 'Origin',
  };
}

/** Answers a preflight for an allowed origin; foreign or missing origins get 403. */
export function preflight(request: Request, config: ApiConfig): Response {
  const origin = request.headers.get('origin');
  if (origin === null || !config.allowedOrigins.has(origin)) {
    return errorBody(403, 'forbidden', 'That action is not allowed.', crypto.randomUUID());
  }
  return new Response(null, {
    headers: {
      'access-control-allow-credentials': 'true',
      // Header names are case-insensitive; the values derive from the contract constants.
      'access-control-allow-headers': `Content-Type, ${PUBLISHER_HEADER}, ${REQUEST_MARKER_HEADER}`,
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'access-control-allow-origin': origin,
      'access-control-max-age': '600',
      vary: 'Origin',
    },
    status: 204,
  });
}

/** Hard deadline for reading a request body; slow streams fail as 408. */
export const HTTP_BODY_TIMEOUT_MS = 10000;

const bodyTimeout = (): ApiError => new ApiError(408, 'timeout', 'The request body took too long.');

/**
 * Reads a JSON body with a hard byte ceiling and a wall-clock deadline enforced while
 * streaming — a lying or absent Content-Length and a stalled sender are both cut off.
 * Wrong media types are 415, oversized 413, timed out 408, malformed JSON 400; schema
 * validation happens afterwards at the route boundary.
 */
export async function readJsonBody(request: Request): Promise<unknown> {
  // Exactly the application/json media type; parameters (charset etc.) may follow.
  const mediaType = (request.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
  if (mediaType !== 'application/json') {
    throw new ApiError(415, 'unsupported-media', 'JSON bodies only.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw badRequest();
  const startedAt = Date.now();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await Promise.race([
        reader.read(),
        new Promise<never>((_r, reject) => {
          timeoutId = setTimeout(
            () => reject(bodyTimeout()),
            Math.max(0, HTTP_BODY_TIMEOUT_MS - (Date.now() - startedAt)),
          );
        }),
      ]);
      clearTimeout(timeoutId);
      timeoutId = undefined;
      if (done) break;
      total += value.byteLength;
      if (total > ARCHIVE_LIMITS.requestBytes) throw new ApiError(413, 'too-large', 'The request is too large.');
      chunks.push(value);
    }
  } catch (error) {
    // Release the remainder so the failure isn't blocked on a stalled sender.
    reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    reader.releaseLock();
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (total === 0) throw badRequest();
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(merged));
  } catch {
    throw badRequest();
  }
}

const SESSION_COOKIE_MAX = 4096;

/**
 * Reads the session cookie. A duplicate cookie name or an oversized header is a
 * malformed request, not a missing session: callers distinguish null (anonymous)
 * from a token to verify.
 */
export function sessionToken(request: Request): string | null {
  const header = request.headers.get('cookie');
  if (header === null) return null;
  if (header.length > SESSION_COOKIE_MAX) throw badRequest();
  const matches: string[] = [];
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === SESSION_COOKIE_NAME) matches.push(part.slice(eq + 1).trim());
  }
  if (matches.length > 1) throw badRequest();
  return matches.length === 1 && matches[0].length > 0 ? matches[0] : null;
}

/** The expired-session Set-Cookie value the sign-out route and account erasure send. */
export const expiredSessionCookie = (secure: boolean): string => sessionCookieValue('', { maxAgeSeconds: 0, secure });

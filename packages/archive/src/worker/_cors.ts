import { errorBody, forbidden } from '../_server/http';
import { PUBLISHER_HEADER, REQUEST_MARKER_HEADER } from '../contract';
import type { ApiConfig } from './env';

/**
 * The catalog's origin posture: exact allowed origins plus the request marker.
 * The issuer runs its own guard (the public-origin verify exception, the account
 * header) because its CORS contract genuinely differs.
 */

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

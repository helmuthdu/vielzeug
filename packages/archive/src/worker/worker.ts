import type { ArchiveCollection } from '../collection';
import { ARCHIVE_LIMITS, type ArchiveErrorCode, archiveHealthSchema, PUBLISHER_HEADER } from '../contract';
import { ArchiveDefinitionError, ArchiveDerivationError } from '../errors';
import { requireSession, type Session, verifySession } from './auth';
import { type ApiConfig, type ArchiveWorkerEnv, apiConfig } from './env';
import {
  ApiError,
  type ArchiveDiagnostic,
  badRequest,
  corsHeaders,
  expiredSessionCookie,
  json,
  preflight,
  queryParams,
  requireMutationGuard,
  toErrorResponse,
} from './http';
import {
  collectionMeta,
  deleteAccountProfile,
  deleteEntry,
  deleteProfile,
  erasePublisher,
  getEntry,
  getMe,
  healthJson,
  listEntries,
  listModerationLog,
  listReports,
  myLikes,
  myPublications,
  myReports,
  publishEntry,
  registerMe,
  renameMe,
  reportEntry,
  resolveReport,
  setHidden,
  setLike,
  updateEntry,
} from './publications';
import { SQL } from './sql';

/**
 * The community-archive Worker factory: anonymous public reads, cookie-authenticated
 * mutations behind strict Origin/request-marker guards, IP and subject rate limits,
 * operator moderation over the registered collections, and a daily expiry sweep for
 * retired publish retry keys.
 *
 * Trust model: configuration and signing keys come only from validated Env bindings;
 * the session cookie is the single credential; every response is either no-store
 * (private/error) or a 30s anonymous public cache entry. Runtime observability
 * flows exclusively through `tap()` — the core itself never logs.
 */

/** The minimal execution-context surface the core uses; the runtime's satisfies it. */
export interface ArchiveExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

/** One sanitized request-completion event: ids, codes, route classes and duration only. */
export interface ArchiveRequestEvent {
  /** 'ok' on success; otherwise the route's `ARCHIVE_ERROR_CODES` value. */
  code: ArchiveErrorCode | 'ok';
  diagnostic?: ArchiveDiagnostic;
  /** Whole-request wall-clock duration in milliseconds. */
  ms: number;
  requestId: string;
  /** A finite route class like `/collections/:collection/entries`, never the raw path. */
  route: string;
  status: number;
  type: 'request';
}

/** The daily retry-key sweep, observable like every other runtime behavior. */
export type ArchiveScheduledEvent =
  | {
      /** Retired retry-key rows this run removed. */
      removed: number;
      type: 'scheduled';
      status: 'ok';
    }
  | { type: 'scheduled'; status: 'failed'; diagnostic: ArchiveDiagnostic };

export type ArchiveEvent =
  | ArchiveRequestEvent
  | ArchiveScheduledEvent
  | { readonly type: 'cache-error'; readonly diagnostic: ArchiveDiagnostic };

/**
 * The Worker's exported-handler shape plus its observability side channel. Declared
 * structurally so the package needs no `@cloudflare/workers-types`: a deployment's
 * generated `ExportedHandler<Env>` accepts the factory's result as-is.
 */
export interface ArchiveWorkerHandler<E extends ArchiveWorkerEnv = ArchiveWorkerEnv> {
  fetch(request: Request, env: E, ctx: ArchiveExecutionContext): Promise<Response>;
  scheduled?(controller: unknown, env: E, ctx: ArchiveExecutionContext): void | Promise<void>;
  /**
   * Observes every request's outcome and every scheduled sweep. The handler owns
   * logging policy (console, a structured logger, or nothing); handler errors are
   * swallowed so observability can never affect the Worker, and with no handlers
   * registered there is zero work.
   */
  tap(handler: (event: ArchiveEvent) => void, options?: { readonly signal?: AbortSignal }): () => void;
}

/** One dispatchable route: the id both the switch and the event labels derive from. */
type RouteId =
  | 'health'
  | 'signOut'
  | 'meta'
  | 'reports'
  | 'resolveReport'
  | 'entries'
  | 'entry'
  | 'like'
  | 'report'
  | 'hidden'
  | 'me'
  | 'accountErase'
  | 'mePublications'
  | 'meLikes'
  | 'meReports'
  | 'modLog'
  | 'publisherErase';

/** One matched route: its id (for dispatch) and label (for events), plus captures. */
interface RouteMatch {
  id: RouteId;
  /** The finite event label, never the raw path. */
  label: string;
  /** The methods the route serves; anything else is 405 before any guard runs. */
  methods: readonly string[];
  /** The path's captured segments, in pattern order: collection first, then id. */
  segments: readonly string[];
}

/**
 * The one route table: dispatch, methods, and event labels all read from here, so a
 * new route can never miss its observability class or its method set. Methods are
 * enforced before any guard runs — a wrong-method request never spends rate-limit
 * budget, verifies a session, or answers an auth-shaped error.
 */
const ROUTES: readonly { id: RouteId; label: string; methods: readonly string[]; pattern: RegExp }[] = [
  { id: 'accountErase', label: '/me/account', methods: ['DELETE'], pattern: /^\/api\/v1\/me\/account$/ },
  { id: 'health', label: '/health', methods: ['GET'], pattern: /^\/api\/v1\/health$/ },
  { id: 'signOut', label: '/sign-out', methods: ['POST'], pattern: /^\/api\/v1\/sign-out$/ },
  {
    id: 'resolveReport',
    label: '/collections/:collection/reports/:id/resolved',
    methods: ['PUT'],
    pattern: /^\/api\/v1\/collections\/([a-z0-9-]+)\/reports\/([0-9a-f-]{36})\/resolved$/i,
  },
  {
    id: 'meta',
    label: '/collections/:collection',
    methods: ['GET'],
    pattern: /^\/api\/v1\/collections\/([a-z0-9-]+)$/,
  },
  {
    id: 'reports',
    label: '/collections/:collection/reports',
    methods: ['GET'],
    pattern: /^\/api\/v1\/collections\/([a-z0-9-]+)\/reports$/,
  },
  {
    id: 'entries',
    label: '/collections/:collection/entries',
    methods: ['GET', 'POST'],
    pattern: /^\/api\/v1\/collections\/([a-z0-9-]+)\/entries$/,
  },
  {
    id: 'entry',
    label: '/collections/:collection/entries/:id',
    methods: ['GET', 'PUT', 'DELETE'],
    pattern: /^\/api\/v1\/collections\/([a-z0-9-]+)\/entries\/([0-9a-f-]{36})$/i,
  },
  {
    id: 'like',
    label: '/collections/:collection/entries/:id/like',
    methods: ['PUT', 'DELETE'],
    pattern: /^\/api\/v1\/collections\/([a-z0-9-]+)\/entries\/([0-9a-f-]{36})\/like$/i,
  },
  {
    id: 'report',
    label: '/collections/:collection/entries/:id/report',
    methods: ['POST'],
    pattern: /^\/api\/v1\/collections\/([a-z0-9-]+)\/entries\/([0-9a-f-]{36})\/report$/i,
  },
  {
    id: 'hidden',
    label: '/collections/:collection/entries/:id/hidden',
    methods: ['PUT', 'DELETE'],
    pattern: /^\/api\/v1\/collections\/([a-z0-9-]+)\/entries\/([0-9a-f-]{36})\/hidden$/i,
  },
  {
    id: 'modLog',
    label: '/moderation-log',
    methods: ['GET'],
    pattern: /^\/api\/v1\/moderation-log$/,
  },
  {
    id: 'publisherErase',
    label: '/publishers/:id',
    methods: ['DELETE'],
    pattern: /^\/api\/v1\/publishers\/([0-9a-f-]{36})$/i,
  },
  { id: 'me', label: '/me', methods: ['GET', 'POST', 'PUT', 'DELETE'], pattern: /^\/api\/v1\/me$/ },
  { id: 'mePublications', label: '/me/publications', methods: ['GET'], pattern: /^\/api\/v1\/me\/publications$/ },
  { id: 'meLikes', label: '/me/likes', methods: ['GET'], pattern: /^\/api\/v1\/me\/likes$/ },
  { id: 'meReports', label: '/me/reports', methods: ['GET'], pattern: /^\/api\/v1\/me\/reports$/ },
];

const matchRoute = (pathname: string): RouteMatch | null => {
  for (const route of ROUTES) {
    const found = pathname.match(route.pattern);
    if (found) return { id: route.id, label: route.label, methods: route.methods, segments: found.slice(1) };
  }
  return null;
};

/** The matched route's event label; unmatched paths stay 'unknown', never the raw path. */
const routeLabel = (pathname: string): string => matchRoute(pathname)?.label ?? 'unknown';

const UUID_PATH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The routes whose second path segment is an entry id: they share the one id rule. */
const ID_SEGMENT_ROUTES: ReadonlySet<RouteId> = new Set(['entry', 'like', 'report', 'hidden', 'resolveReport']);

const notAllowed = (): ApiError => new ApiError(405, 'method-not-allowed', 'That method is not supported here.');

const hmacKeys = new WeakMap<ApiConfig, Promise<CryptoKey>>();
/** Peppered HMAC: rate-limit keys cannot be reversed to IPs without the deployment secret. */
const rateLimitHash = async (config: ApiConfig, text: string): Promise<string> => {
  let key = hmacKeys.get(config);
  if (key === undefined) {
    key = crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(config.rateLimitPepper),
      { hash: 'SHA-256', name: 'HMAC' },
      false,
      ['sign'],
    );
    hmacKeys.set(config, key);
  }
  const mac = await crypto.subtle.sign('HMAC', await key, new TextEncoder().encode(text));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * The Retry-After the 429s carry. The platform limiter does not expose its period at
 * runtime, so deployments must configure 60-second windows — a longer window would
 * make the header lie.
 */
const RATE_LIMIT_RETRY_AFTER_SECONDS = 60;

/** The connecting IP, peppered-HMAC'd, keys the read limit; loopback only when APP_ENV=local. */
async function readLimit(config: ApiConfig, env: ArchiveWorkerEnv, request: Request): Promise<void> {
  const ip = request.headers.get('cf-connecting-ip') ?? (config.appEnv === 'local' ? '127.0.0.1' : null);
  if (ip === null) throw new ApiError(503, 'unavailable', 'The service is temporarily unavailable.');
  const { success } = await env.READ_LIMIT.limit({ key: await rateLimitHash(config, ip) });
  if (!success) {
    throw new ApiError(429, 'rate-limited', 'Too many requests. Try again later.', {
      retryAfterSeconds: RATE_LIMIT_RETRY_AFTER_SECONDS,
    });
  }
}

/** The verified issuer+subject, peppered-HMAC'd, keys the write limit ahead of every mutation. */
async function writeLimit(config: ApiConfig, env: ArchiveWorkerEnv, issuer: string, subject: string): Promise<void> {
  const { success } = await env.WRITE_LIMIT.limit({
    key: await rateLimitHash(config, JSON.stringify([issuer, subject])),
  });
  if (!success) {
    throw new ApiError(429, 'rate-limited', 'Too many requests. Try again later.', {
      retryAfterSeconds: RATE_LIMIT_RETRY_AFTER_SECONDS,
    });
  }
}

/** Only anonymous list reads may serve from the edge cache. */
async function cachedPublicGet(
  request: Request,
  ctx: ArchiveExecutionContext,
  produce: () => Promise<Response>,
  onFailure: () => void,
): Promise<Response> {
  const anonymous = request.headers.get('cookie') === null && request.headers.get('authorization') === null;
  if (!anonymous) return produce();
  const url = new URL(request.url);
  url.search = new URLSearchParams(
    [...url.searchParams.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  ).toString();
  const edgeCache = caches.default;
  const key = new Request(url.toString(), { method: 'GET' });
  const cached = await edgeCache.match(key).catch(() => {
    onFailure();
    return undefined;
  });
  if (cached) return cached;
  const response = await produce();
  response.headers.set(
    'cache-control',
    `public, max-age=${ARCHIVE_LIMITS.publicCacheSeconds}, s-maxage=${ARCHIVE_LIMITS.publicCacheSeconds}`,
  );
  ctx.waitUntil(edgeCache.put(key, response.clone()).catch(onFailure));
  return response;
}

const withCors = (response: Response, request: Request, config: ApiConfig): Response => {
  const headers = corsHeaders(request, config);
  if (Object.keys(headers).length === 0) return response;
  const next = new Response(response.body, response);
  for (const [key, value] of Object.entries(headers)) next.headers.set(key, value);
  return next;
};

/**
 * Fail-closed precondition for registered publishers: the UI pins the opaque
 * publisher UUID it believes the session belongs to, so a queued write from one
 * tab can never land under another account that took over the shared cookie.
 * The header is never an identity source — every check still resolves the
 * publisher from the verified JWT — it only vetoes mismatched writes.
 */
function requireExpectedPublisher(request: Request, session: Session, exempt: boolean): void {
  if (exempt || session.publisher === null) return;
  const expected = request.headers.get(PUBLISHER_HEADER);
  if (expected === null || !UUID_PATH.test(expected)) {
    throw new ApiError(400, 'bad-request', 'The request is not valid.');
  }
  if (expected !== session.publisher.id) {
    throw new ApiError(409, 'publisher-changed', 'The signed-in publisher changed since this request was prepared.');
  }
}

/**
 * Builds the Worker for one deployment's registered collections. Each collection owns
 * one URL + storage dimension; a duplicate registration is a deployment bug and
 * fails fast.
 */
export function createArchiveWorker<E extends ArchiveWorkerEnv>(
  collections: readonly ArchiveCollection[],
): ArchiveWorkerHandler<E> {
  const registered = new Map<string, ArchiveCollection>();
  for (const collection of collections) {
    if (registered.has(collection.name))
      throw new ArchiveDefinitionError(`Duplicate archive collection: ${collection.name}`);
    registered.set(collection.name, collection);
  }

  /** Resolves the route's collection segment; an unregistered collection is a 404, not a 500. */
  const collectionFor = (segment: string): ArchiveCollection => {
    const collection = registered.get(segment);
    if (collection === undefined) throw new ApiError(404, 'not-found', 'No such route.');
    return collection;
  };

  async function handle(request: Request, env: E, ctx: ArchiveExecutionContext): Promise<Response> {
    const config = apiConfig(env);
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (!pathname.startsWith('/api/v1/')) throw new ApiError(404, 'not-found', 'No such route.');
    if (method === 'OPTIONS') return preflight(request, config);

    const match = matchRoute(pathname);
    // An unknown path inside the mount answers 404 like the paths outside it, and a
    // known route under an unsupported method answers 405 — both with no side
    // effects: no rate-limit spend, no session verification, no auth state leaked,
    // no guard-shaped error for a method the route does not serve.
    if (match === null) throw new ApiError(404, 'not-found', 'No such route.');
    if (!match.methods.includes(method)) throw notAllowed();

    // A malformed entry id is the same class of client bug: it answers 400 before
    // any rate-limit spend, session verification or auth state.
    if (ID_SEGMENT_ROUTES.has(match.id) && !UUID_PATH.test(match.segments[1] ?? '')) throw badRequest();

    // Health sits deliberately outside the rate-limit and session pipelines: uptime
    // probes must never burn the anonymous read budget or couple to authentication,
    // and it touches the database exactly once (the schema-version read).
    if (match.id === 'health') {
      return withCors(await healthJson(config, env), request, config);
    }
    if (match.id === 'reports') queryParams(url, ['cursor', 'limit', 'status']);

    await readLimit(config, env, request);

    // The same-origin mutation contract is proven BEFORE any identity work: a
    // foreign-origin write or missing marker must fail with 403 even while carrying a
    // garbage token — JWKS/JWT cost and 401 semantics stay behind the origin fence.
    const isMutation = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
    if (isMutation) requireMutationGuard(request, config);

    // Session verification runs only where identity matters: private routes, the
    // moderation surfaces and every mutation. Public reads (list, detail, meta) never
    // invoke JWKS or the publisher lookup — browsing must not couple to authentication
    // availability. Sign-out is a cookie-clearing reply, not a session operation.
    const isPublicGet = method === 'GET' && (match.id === 'meta' || match.id === 'entries' || match.id === 'entry');
    const isSignOut = match.id === 'signOut' && method === 'POST';
    const session =
      isPublicGet || isSignOut ? null : await verifySession(request, config, env, match.id === 'accountErase');

    if (isMutation) {
      if (isSignOut) {
        // The shared `archiveOkSchema` body; every session cookie attribute is the
        // contract's, never ad hoc.
        const response = json(
          200,
          { ok: true },
          {
            'cache-control': 'no-store',
            'set-cookie': expiredSessionCookie(config.appEnv === 'production'),
          },
        );
        return withCors(response, request, config);
      }
      const verified = requireSession(session);
      // The free fail-closed header precondition runs before the quota token is spent:
      // a stale tab's rejected writes must not consume the current account's budget.
      requireExpectedPublisher(request, verified, match.id === 'me' && method === 'POST');
      await writeLimit(config, env, verified.subject.issuer, verified.subject.subject);
    }

    const jsonWithCors = (response: Response) => withCors(response, request, config);

    switch (match.id) {
      case 'meta': {
        queryParams(url, []);
        return jsonWithCors(collectionMeta(collectionFor(match.segments[0] ?? '')));
      }
      case 'entries': {
        const collection = collectionFor(match.segments[0] ?? '');
        if (method === 'GET') {
          const response = await cachedPublicGet(
            request,
            ctx,
            () => listEntries(collection, request, env),
            () => emit({ diagnostic: { kind: 'cache' }, type: 'cache-error' }),
          );
          return jsonWithCors(response);
        }
        if (method === 'POST') {
          return jsonWithCors(await publishEntry(collection, request, env, config, requireSession(session)));
        }
        throw notAllowed();
      }
      case 'entry': {
        const collection = collectionFor(match.segments[0] ?? '');
        const id = match.segments[1] ?? '';
        if (method === 'GET') {
          queryParams(url, []);
          return jsonWithCors(await getEntry(collection, env, id));
        }
        if (method === 'PUT') {
          return jsonWithCors(await updateEntry(collection, request, env, config, requireSession(session), id));
        }
        if (method === 'DELETE') {
          return jsonWithCors(await deleteEntry(collection, env, requireSession(session), id));
        }
        throw notAllowed();
      }
      case 'like': {
        const collection = collectionFor(match.segments[0] ?? '');
        const id = match.segments[1] ?? '';
        if (method === 'PUT') {
          return jsonWithCors(await setLike(collection, env, config, requireSession(session), id, true));
        }
        if (method === 'DELETE') {
          return jsonWithCors(await setLike(collection, env, config, requireSession(session), id, false));
        }
        throw notAllowed();
      }
      case 'report': {
        if (method !== 'POST') throw notAllowed();
        const collection = collectionFor(match.segments[0] ?? '');
        return jsonWithCors(
          await reportEntry(collection, request, env, requireSession(session), match.segments[1] ?? ''),
        );
      }
      case 'hidden': {
        if (method !== 'PUT' && method !== 'DELETE') throw notAllowed();
        const collection = collectionFor(match.segments[0] ?? '');
        return jsonWithCors(
          await setHidden(collection, env, requireSession(session), match.segments[1] ?? '', method === 'PUT'),
        );
      }
      case 'reports': {
        // Private reads carry the same fail-closed precondition as writes: a stale tab
        // must not read another publisher's moderation queue after an account switch.
        const verified = requireSession(session);
        requireExpectedPublisher(request, verified, false);
        return jsonWithCors(await listReports(collectionFor(match.segments[0] ?? ''), request, env, verified));
      }
      case 'resolveReport': {
        queryParams(url, []);
        return jsonWithCors(
          await resolveReport(
            collectionFor(match.segments[0] ?? ''),
            env,
            requireSession(session),
            match.segments[1] ?? '',
          ),
        );
      }
      case 'modLog': {
        // The accountability read carries the same fail-closed precondition as every
        // private surface: a stale tab must not read the moderation history after an
        // account switch.
        const verified = requireSession(session);
        requireExpectedPublisher(request, verified, false);
        return jsonWithCors(await listModerationLog(request, env, verified));
      }
      case 'publisherErase': {
        // The terminal moderation action: erasing a publisher removes their row, and
        // FK cascades take the publications, likes and retry keys with it — the same
        // cascade a self-erase walks, applied to any publisher the operator names.
        if (method !== 'DELETE') throw notAllowed();
        return jsonWithCors(await erasePublisher(env, requireSession(session), match.segments[0] ?? ''));
      }
      case 'accountErase': {
        queryParams(url, []);
        return jsonWithCors(await deleteAccountProfile(env, requireSession(session)));
      }
      case 'me': {
        if (method === 'GET') return jsonWithCors(getMe(session));
        if (method === 'POST') return jsonWithCors(await registerMe(request, env, requireSession(session)));
        if (method === 'PUT') return jsonWithCors(await renameMe(request, env, requireSession(session)));
        if (method === 'DELETE') return jsonWithCors(await deleteProfile(env, requireSession(session)));
        throw notAllowed();
      }
      case 'mePublications':
      case 'meLikes':
      case 'meReports': {
        // Private reads carry the same fail-closed precondition as writes: a stale tab
        // must not consume another publisher's data after a shared-cookie account switch.
        const verified = requireSession(session);
        requireExpectedPublisher(request, verified, false);
        if (match.id === 'mePublications') {
          // The owner's entries are per-collection: the collection param names the
          // registered collection, and an absent or unregistered value is a malformed
          // request, not an empty list.
          const params = queryParams(url, ['collection']);
          const requested = params.get('collection');
          if (requested === null) throw badRequest();
          const collection = registered.get(requested);
          if (collection === undefined) throw badRequest();
          return jsonWithCors(await myPublications(collection, env, verified));
        }
        return jsonWithCors(
          await (match.id === 'meReports' ? myReports(request, env, verified) : myLikes(request, env, verified)),
        );
      }
      default:
        throw notAllowed();
    }
  }

  const tappers = new Set<(event: ArchiveEvent) => void>();
  const emit = (event: ArchiveEvent): void => {
    if (tappers.size === 0) return;
    for (const tapper of tappers) {
      try {
        tapper(event);
      } catch {
        // Observability must never affect the Worker.
      }
    }
  };

  return {
    async fetch(request: Request, env: E, ctx: ArchiveExecutionContext): Promise<Response> {
      const requestId = crypto.randomUUID();
      const route = routeLabel(new URL(request.url).pathname);
      const startedAt = Date.now();
      try {
        const response = await handle(request, env, ctx);
        let diagnostic: ArchiveDiagnostic | undefined;
        if (response.status === 503 && route === '/health') {
          const health = archiveHealthSchema.parse(await response.clone().json());
          diagnostic = { kind: health.reason === 'database-unavailable' ? 'database' : 'schema' };
        }
        emit({
          code: response.ok ? 'ok' : 'unavailable',
          ms: Date.now() - startedAt,
          requestId,
          route,
          status: response.status,
          type: 'request',
          ...(diagnostic === undefined ? {} : { diagnostic }),
        });
        return response;
      } catch (error) {
        const response = toErrorResponse(error, requestId);
        emit({
          code: error instanceof ApiError ? error.code : 'internal',
          diagnostic:
            error instanceof ApiError
              ? error.diagnostic
              : { kind: error instanceof ArchiveDerivationError ? 'collection' : 'internal' },
          ms: Date.now() - startedAt,
          requestId,
          route,
          status: response.status,
          type: 'request',
        });
        // Allowed origins see the same CORS contract on errors as on successes.
        try {
          return withCors(response, request, apiConfig(env));
        } catch {
          return response; // the config error itself is the response
        }
      }
    },

    async scheduled(_controller: unknown, env: E, _ctx: ArchiveExecutionContext): Promise<void> {
      try {
        const timestamp = Date.now();
        const results = await env.DB.batch([
          env.DB.prepare(SQL.expireRequests).bind(timestamp),
          env.DB.prepare(SQL.expireRevocations).bind(timestamp),
        ]);
        emit({
          removed: results.reduce((sum, result) => sum + (result.meta?.changes ?? 0), 0),
          status: 'ok',
          type: 'scheduled',
        });
      } catch (error) {
        emit({ diagnostic: { kind: 'database' }, status: 'failed', type: 'scheduled' });
        throw error;
      }
    },

    tap(handler, options) {
      const signal = options?.signal;
      if (signal?.aborted) return () => {};
      const off = () => {
        tappers.delete(handler);
        signal?.removeEventListener('abort', off);
      };
      tappers.add(handler);
      signal?.addEventListener('abort', off, { once: true });
      return off;
    },
  };
}

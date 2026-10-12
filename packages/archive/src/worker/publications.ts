import { s } from '@vielzeug/spell';
import type { ArchiveCollection } from '../collection';
import {
  ARCHIVE_CONTRACT_VERSION,
  ARCHIVE_LIMITS,
  ARCHIVE_SCHEMA_VERSION,
  type ArchiveModerationAction,
  archiveAliasSchema,
  archiveCollectionMetaSchema,
  archiveHealthSchema,
  archiveIdentitySchema,
  archiveLikedIdsSchema,
  archiveLikeStateSchema,
  archiveLikesPageSchema,
  archiveModerationLogSchema,
  archiveOwnReportsSchema,
  archiveReportsSchema,
  archiveSortSchema,
  isWellFormedText,
  SESSION_MAX_AGE_SECONDS,
  uuidSchema,
} from '../contract';
import { decodeCursorValue, encodeCursorValue, forwardPage, nextCursor } from './_pagination';
import { JWT_CLOCK_TOLERANCE_SECONDS, type Publisher, type Session } from './auth';
import type { ApiConfig, ArchiveWorkerEnv } from './env';
import {
  ApiError,
  badRequest,
  conflict,
  forbidden,
  invalid,
  json,
  noStore,
  notFound,
  queryParams,
  readJsonBody,
} from './http';
import {
  likedPublicationsSql,
  likesPageSql,
  listPublicationsSql,
  moderationLogSql,
  type PublicationCursor,
  type PublicationFilter,
  reportsPageSql,
  SQL,
} from './sql';

/**
 * Route handlers for /api/v1, parameterized by the registered collection. All SQL lives
 * in sql.ts and is bound positionally here in the authored order; the DTO boundary
 * re-validates every stored row before it leaves, content validation lives in the
 * collection's derive step, and moderation state (hidden entries) is visible only
 * through the owner and operator surfaces.
 */

interface PublicationRow {
  author_name: string;
  client_key: string;
  collection: string;
  content_hash: string;
  content_version: number;
  filter_value: string | null;
  /** Null while visible; set while an operator has removed the entry from public view. */
  hidden_at: string | null;
  id: string;
  like_count: number;
  owner_id: string;
  payload_json: string;
  published_at: string;
  revision: number;
  schema_version: number;
  tags_json: string;
  title: string;
  updated_at: string;
}

async function databaseCall<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (cause) {
    throw new ApiError(500, 'internal', 'The service is not available.', { cause, diagnostic: { kind: 'database' } });
  }
}
const first = <T>(env: ArchiveWorkerEnv, sql: string, ...params: (string | number | null)[]) =>
  databaseCall(() =>
    env.DB.prepare(sql)
      .bind(...params)
      .first<T>(),
  );
const all = <T>(env: ArchiveWorkerEnv, sql: string, ...params: (string | number | null)[]) =>
  databaseCall(async () => {
    const result = await env.DB.prepare(sql)
      .bind(...params)
      .all<T>();
    if (!Array.isArray(result.results)) throw new Error('Missing database query results');
    return result.results;
  });
const run = (env: ArchiveWorkerEnv, sql: string, ...params: (string | number | null)[]) =>
  databaseCall(() =>
    env.DB.prepare(sql)
      .bind(...params)
      .run(),
  );

const uuid = (): string => crypto.randomUUID();
const now = (): string => new Date().toISOString();

/** A stored row that fails the emitted-DTO contract is unavailable, not malformed data. */
const recordUnavailable = (): ApiError =>
  new ApiError(503, 'record-unavailable', 'The record is not available.', { diagnostic: { kind: 'record' } });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Maps a joined row to the public DTO through the collection's strict entry schema:
 * stored JSON is parsed and re-validated, stored versions are emitted as-is, and any
 * drift — unknown fields, corrupt payload, mismatched versions — surfaces as 503
 * `record-unavailable` rather than leaking or fabricating data.
 */
const rowToEntry = (collection: ArchiveCollection, row: PublicationRow) => {
  let payloadJson: unknown;
  try {
    payloadJson = JSON.parse(row.payload_json);
  } catch {
    throw recordUnavailable();
  }
  const parsed = collection.contract.entry.safeParse({
    author: { id: row.owner_id, name: row.author_name },
    contentHash: row.content_hash,
    contentVersion: row.content_version,
    id: row.id,
    likeCount: row.like_count,
    payload: payloadJson,
    publishedAt: row.published_at,
    revision: row.revision,
    schemaVersion: row.schema_version,
    updatedAt: row.updated_at,
  });
  if (!parsed.success) throw recordUnavailable();
  return parsed.data;
};

const rowToOwnedEntry = (collection: ArchiveCollection, row: PublicationRow) => {
  const entry = rowToEntry(collection, row);
  // The private owner DTO adds the create retry key and the moderation state;
  // public routes never emit either.
  const key = uuidSchema.safeParse(row.client_key);
  if (!key.success) throw recordUnavailable();
  return { ...entry, clientKey: row.client_key, hidden: row.hidden_at !== null };
};

const entryById = async (collection: ArchiveCollection, env: ArchiveWorkerEnv, id: string) => {
  const row = await first<PublicationRow>(env, SQL.publication, id, collection.name);
  return row === null ? null : rowToEntry(collection, row);
};

/* ----------------------------------- list --------------------------------- */

type CursorDirection = 'next' | 'previous';

/** Normalizes free text into the bounded FTS prefix-match expression the SQL expects. */
const searchMatchFor = (search: string | null): string | undefined => {
  if (search === null) return undefined;
  if (search.length > ARCHIVE_LIMITS.searchChars) throw badRequest();
  // Unicode word extraction: punctuation splits terms rather than poisoning them,
  // so "Hunter's" and "fire-ice" match the words their indexed titles carry.
  const terms = (search.match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, ARCHIVE_LIMITS.searchTerms);
  if (terms.length === 0) return undefined;
  return terms.map((t) => `"${t}"*`).join(' ');
};

/** The cursor carries direction plus filter context so a replayed/mismatched cursor is 400. */
interface CursorPayload {
  c: PublicationCursor;
  d: CursorDirection;
  q: {
    a: string | null;
    e: string | null;
    g: string;
    m: string | null;
    s: 'liked' | 'recent';
    t: string | null;
  };
}

const cursorPayloadSchema = s.object({
  c: s.object({
    id: s.string().uuid(),
    likeCount: s.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    publishedAt: s.string().isoDateTime(),
  }),
  d: s.enum(['next', 'previous'] as const),
  q: s.object({
    a: s.string().uuid().nullable(),
    e: s.string().max(ARCHIVE_LIMITS.vocabChars).nullable(),
    g: s.string().max(ARCHIVE_LIMITS.vocabChars),
    m: s
      .string()
      .max(ARCHIVE_LIMITS.searchChars * ARCHIVE_LIMITS.searchTerms)
      .nullable(),
    s: s.enum(['liked', 'recent'] as const),
    t: s.string().max(ARCHIVE_LIMITS.vocabChars).nullable(),
  }),
});

const cursorFromRow = (row: PublicationRow): PublicationCursor => ({
  id: row.id,
  likeCount: row.like_count,
  publishedAt: row.published_at,
});

const encodeCursor = (row: PublicationRow, direction: CursorDirection, query: PublicationFilter): string =>
  encodeCursorValue({
    c: cursorFromRow(row),
    d: direction,
    q: {
      a: query.author ?? null,
      e: query.filter ?? null,
      g: query.collection,
      m: query.searchMatch ?? null,
      s: query.sort,
      t: query.tag ?? null,
    },
  } satisfies CursorPayload);

const decodeCursor = (raw: string, query: PublicationFilter): CursorPayload => {
  const payload = decodeCursorValue(raw, cursorPayloadSchema);
  const { q } = payload;
  if (
    (q.a ?? undefined) !== query.author ||
    q.s !== query.sort ||
    q.g !== query.collection ||
    (q.e ?? undefined) !== query.filter ||
    (q.m ?? undefined) !== query.searchMatch ||
    (q.t ?? undefined) !== query.tag
  ) {
    throw badRequest();
  }
  return payload;
};

export async function listEntries(
  collection: ArchiveCollection,
  request: Request,
  env: ArchiveWorkerEnv,
): Promise<Response> {
  const url = new URL(request.url);
  const params = queryParams(url, ['author', 'cursor', 'filter', 'limit', 'search', 'sort', 'tag']);

  const sortRaw = params.get('sort') ?? 'recent';
  const sortParsed = archiveSortSchema.safeParse(sortRaw);
  if (!sortParsed.success) throw badRequest();

  const limitRaw = params.get('limit');
  const limit = limitRaw === null ? ARCHIVE_LIMITS.pageSize : Number(limitRaw);
  if (!Number.isInteger(limit) || limit < 1 || limit > ARCHIVE_LIMITS.maxPageSize) throw badRequest();

  const filter = params.get('filter');
  if (filter !== null && !collection.filters.includes(filter)) throw badRequest();
  const tag = params.get('tag');
  if (tag !== null && !collection.tags.includes(tag)) throw badRequest();
  const author = params.get('author');
  if (author !== null && !UUID_RE.test(author)) throw badRequest();

  const searchMatch = searchMatchFor(params.get('search'));
  const query: PublicationFilter = {
    author: author ?? undefined,
    collection: collection.name,
    filter: filter ?? undefined,
    limit: limit + 1,
    searchMatch,
    sort: sortParsed.data,
    tag: tag ?? undefined,
  };

  // The cursor tells the fetch direction; the first page always walks forward.
  const cursorRaw = params.get('cursor');
  const decoded = cursorRaw === null ? null : decodeCursor(cursorRaw, query);
  const direction: CursorDirection = decoded?.d ?? 'next';
  if (decoded !== null) query.cursor = decoded.c;
  query.direction = direction;

  const fetchRows = async (f: PublicationFilter): Promise<PublicationRow[]> => {
    const bound = listPublicationsSql(f);
    return all<PublicationRow>(env, bound.sql, ...bound.parameters);
  };

  const fetched = await fetchRows(query);
  const hasMore = fetched.length > limit;
  // 'previous' reads ASC off the cursor; display flips back to normal DESC order.
  const page = fetched.slice(0, limit);
  if (direction === 'previous') page.reverse();

  // Bounded index probes — never a count query — decide has-more in the opposite
  // direction. A first (uncursored) page needs no backward probe: it IS the top.
  let hasOpposite = false;
  if (decoded !== null && page.length > 0) {
    const probe: PublicationFilter = { ...query, limit: 1 };
    if (direction === 'next') {
      probe.cursor = cursorFromRow(page[0]);
      probe.direction = 'previous';
    } else {
      probe.cursor = cursorFromRow(page[page.length - 1]);
      probe.direction = 'next';
    }
    hasOpposite = (await fetchRows(probe)).length > 0;
  }

  const next =
    page.length > 0 && ((direction === 'next' && hasMore) || (direction === 'previous' && hasOpposite))
      ? encodeCursor(page[page.length - 1], 'next', query)
      : null;
  const previous =
    page.length > 0 && ((direction === 'previous' && hasMore) || (direction === 'next' && hasOpposite))
      ? encodeCursor(page[0], 'previous', query)
      : null;

  // Entries are validated per row through the collection's entry schema; the cursors
  // are internally generated, so the page composes validated parts directly.
  const pageDto = { cursor: next, entries: page.map((row) => rowToEntry(collection, row)), previous };
  return json(200, pageDto, noStore);
}

/** The collection's public self-description: name plus the declared query vocabularies. */
export function collectionMeta(collection: ArchiveCollection): Response {
  const parsed = archiveCollectionMetaSchema.safeParse({
    filters: [...collection.filters].sort(),
    name: collection.name,
    tags: [...collection.tags].sort(),
  });
  if (!parsed.success) throw recordUnavailable();
  return json(200, parsed.data, noStore);
}

export async function getEntry(collection: ArchiveCollection, env: ArchiveWorkerEnv, id: string): Promise<Response> {
  const entry = await entryById(collection, env, id);
  if (entry === null) throw notFound();
  return json(200, entry, noStore);
}

/* ---------------------------------- health --------------------------------- */

/**
 * Service health: the feature flags, the wire limits, and the storage schema stamp
 * actually present in the database. A database whose migrations lag the package
 * answers `degraded` instead of pretending to be fine — the most likely deployment
 * fault becomes a one-glance diagnosis.
 */
export async function healthJson(config: ApiConfig, env: ArchiveWorkerEnv): Promise<Response> {
  let dbSchemaVersion: number | null = null;
  let reason: 'database-unavailable' | 'schema-mismatch' | null = null;
  try {
    const row = await first<{ applied: number }>(env, SQL.schemaVersion);
    dbSchemaVersion = row?.applied ?? 0;
  } catch {
    reason = 'database-unavailable';
  }
  if (reason === null && dbSchemaVersion !== ARCHIVE_SCHEMA_VERSION) reason = 'schema-mismatch';
  const parsed = archiveHealthSchema.safeParse({
    dbSchemaVersion,
    features: { likes: config.likesEnabled, publishing: config.publishingEnabled },
    limits: ARCHIVE_LIMITS,
    reason,
    schemaVersion: ARCHIVE_CONTRACT_VERSION,
    status: reason === null ? 'ok' : 'degraded',
  });
  if (!parsed.success) throw recordUnavailable();
  return json(reason === null ? 200 : 503, parsed.data, noStore);
}

/* --------------------------------- identity -------------------------------- */

/** Emits the private identity DTO through the strict shared schema. */
const identityJson = (status: number, identity: unknown): Response => {
  const parsed = archiveIdentitySchema.safeParse(identity);
  if (!parsed.success) throw recordUnavailable();
  return json(status, parsed.data, noStore);
};

export function getMe(session: Session | null): Response {
  return identityJson(
    200,
    session?.publisher
      ? { id: session.publisher.id, name: session.publisher.displayName, operator: session.operator }
      : null,
  );
}

export async function registerMe(request: Request, env: ArchiveWorkerEnv, session: Session): Promise<Response> {
  const body = await readJsonBody(request);
  const parsed = registerBodySchema.safeParse(body);
  if (!parsed.success) throw invalid();
  const name = parsed.data.name ?? '';

  const existing = await first<{ display_name: string; id: string }>(
    env,
    SQL.publisher,
    session.subject.issuer,
    session.subject.subject,
  );
  if (existing !== null) {
    return identityJson(200, { id: existing.id, name: existing.display_name, operator: session.operator });
  }
  const id = uuid();
  await run(
    env,
    SQL.insertPublisher,
    id,
    session.subject.issuer,
    session.subject.subject,
    name,
    now(),
    session.subject.issuer,
    session.subject.subject,
    Date.now(),
  );
  const row = await first<{ display_name: string; id: string }>(
    env,
    SQL.publisher,
    session.subject.issuer,
    session.subject.subject,
  );
  if (row === null) {
    if ((await first(env, SQL.revokedSubject, session.subject.issuer, session.subject.subject, Date.now())) !== null) {
      throw new ApiError(401, 'unauthenticated', 'Sign-in is required.');
    }
    throw conflict();
  }
  return identityJson(201, { id: row.id, name: row.display_name, operator: session.operator });
}

export async function renameMe(request: Request, env: ArchiveWorkerEnv, session: Session): Promise<Response> {
  const publisher = requirePublisherRow(session);
  const body = await readJsonBody(request);
  const parsed = renameBodySchema.safeParse(body);
  if (!parsed.success) throw invalid();
  if (parsed.data.name !== publisher.displayName) {
    await run(env, SQL.renamePublisher, parsed.data.name, publisher.id, parsed.data.name);
  }
  return identityJson(200, { id: publisher.id, name: parsed.data.name, operator: session.operator });
}

/**
 * Archive-profile erasure, independent of the identity provider's account.
 * The credential survives so an issuer can retry coordinated account erasure.
 */
export async function deleteProfile(env: ArchiveWorkerEnv, session: Session): Promise<Response> {
  if (session.publisher !== null) await run(env, SQL.deletePublisher, session.publisher.id);
  return new Response(null, {
    headers: {
      'cache-control': 'no-store',
    },
    status: 204,
  });
}

/** Revocation and erasure share a transaction, preventing a stale session from recreating the profile. */
export async function deleteAccountProfile(env: ArchiveWorkerEnv, session: Session): Promise<Response> {
  const { issuer, subject } = session.subject;
  // Issuance may be one tolerance ahead; expiry verification permits another.
  await databaseCall(() =>
    env.DB.batch([
      env.DB.prepare(SQL.revokeSubject).bind(
        issuer,
        subject,
        Date.now() + (SESSION_MAX_AGE_SECONDS + 2 * JWT_CLOCK_TOLERANCE_SECONDS) * 1000,
      ),
      env.DB.prepare(SQL.deleteSubjectPublisher).bind(issuer, subject),
    ]),
  );
  return new Response(null, { headers: noStore, status: 204 });
}

/**
 * Operator-side GDPR erasure: removes any publisher's row; FK cascades take its
 * publications, likes and retry keys. Idempotent for the same reason the self-erase
 * is: an already-erased publisher is a 204 with nothing left to remove.
 */
export async function erasePublisher(env: ArchiveWorkerEnv, session: Session, publisherId: string): Promise<Response> {
  const operator = requireOperatorRow(session);
  // The terminal moderation action: erasing a publisher removes their row, and FK
  // cascades take the publications, likes and retry keys with it — the same cascade a
  // self-erase walks, applied to any publisher the operator names. The guarded audit
  // and deletion share a transaction, so retries never record fictitious actions.
  await databaseCall(() =>
    env.DB.batch([
      env.DB.prepare(SQL.auditErasure).bind(uuid(), operator.id, now(), publisherId),
      env.DB.prepare(SQL.deletePublisher).bind(publisherId),
    ]),
  );
  return new Response(null, { headers: noStore, status: 204 });
}

/** The operator's accountability log: newest actions first, bounded, ids only. */
export async function listModerationLog(request: Request, env: ArchiveWorkerEnv, session: Session): Promise<Response> {
  requireOperatorRow(session);
  const context = 'moderation-log';
  const { cursor, limit } = forwardPage(request, context);
  const bound = moderationLogSql({ cursor, limit: limit + 1 });
  const rows = await all<{
    id: string;
    action: ArchiveModerationAction;
    collection: string | null;
    created_at: string;
    operator_id: string;
    target_id: string;
  }>(env, bound.sql, ...bound.parameters);
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const parsed = archiveModerationLogSchema.safeParse({
    actions: page.map((row) => ({
      action: row.action,
      collection: row.collection,
      createdAt: row.created_at,
      id: row.id,
      operatorId: row.operator_id,
      targetId: row.target_id,
    })),
    cursor:
      rows.length > limit && last !== undefined
        ? nextCursor({ createdAt: last.created_at, id: last.id }, context)
        : null,
  });
  if (!parsed.success) throw recordUnavailable();
  return json(200, parsed.data, noStore);
}

export const requirePublisherRow = (session: Session): Publisher => {
  if (session.publisher === null) throw forbidden('Register before publishing.');
  return session.publisher;
};

/** Operator authority plus a registered publisher row: moderation routes need both,
 * the role claim for authority and the row for attribution. */
export const requireOperatorRow = (session: Session): Publisher => {
  if (!session.operator) throw forbidden('Operator access is required.');
  if (session.publisher === null) throw forbidden('Register before moderating.');
  return session.publisher;
};

// Private identity payloads share the one alias rule with the emitted DTOs.
const registerBodySchema = s.object({ name: archiveAliasSchema.optional() });
const renameBodySchema = s.object({ name: archiveAliasSchema });

export async function myPublications(
  collection: ArchiveCollection,
  env: ArchiveWorkerEnv,
  session: Session,
): Promise<Response> {
  if (session.publisher === null) return json(200, { entries: [] }, noStore);
  const rows = await all<PublicationRow>(
    env,
    SQL.ownPublications,
    session.publisher.id,
    collection.name,
    ARCHIVE_LIMITS.maxPublications,
  );
  // The private owner DTO adds the create retry key; public routes never emit it.
  return json(200, { entries: rows.map((row) => rowToOwnedEntry(collection, row)) }, noStore);
}

export async function myLikes(request: Request, env: ArchiveWorkerEnv, session: Session): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const raw = params.get('ids');
  if (raw === null) {
    const context = `likes:${session.publisher?.id ?? 'unregistered'}`;
    const { cursor, limit } = forwardPage(request, context);
    if (session.publisher === null) return json(200, { cursor: null, ids: [] }, noStore);
    const bound = likesPageSql(session.publisher.id, { cursor, limit: limit + 1 });
    const rows = await all<{ created_at: string; publication_id: string }>(env, bound.sql, ...bound.parameters);
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    const parsed = archiveLikesPageSchema.safeParse({
      cursor:
        rows.length > limit && last !== undefined
          ? nextCursor({ createdAt: last.created_at, id: last.publication_id }, context)
          : null,
      ids: page.map((row) => row.publication_id),
    });
    if (!parsed.success) throw recordUnavailable();
    return json(200, parsed.data, noStore);
  }
  queryParams(new URL(request.url), ['ids']);
  const ids = [...new Set(raw.split(','))];
  if (ids.length > ARCHIVE_LIMITS.likeStateIds || ids.some((id) => !UUID_RE.test(id))) throw badRequest();
  if (session.publisher === null) return json(200, { ids: [] }, noStore);
  const bound = likedPublicationsSql(session.publisher.id, ids);
  const rows = await all<{ publication_id: string }>(env, bound.sql, ...bound.parameters);
  const liked = new Set(rows.map((r) => r.publication_id));
  const dto = { ids: ids.filter((id) => liked.has(id)) };
  const validated = archiveLikedIdsSchema.safeParse(dto);
  if (!validated.success) throw recordUnavailable();
  return json(200, validated.data, noStore);
}

/* --------------------------------- mutations ------------------------------- */

// The core validates the request envelope; the collection's derive step validates the payload.
const publishBodySchema = s.object({ clientKey: uuidSchema, payload: s.unknown() });
const updateBodySchema = s.object({
  expectedRevision: s.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  payload: s.unknown(),
});

export async function publishEntry(
  collection: ArchiveCollection,
  request: Request,
  env: ArchiveWorkerEnv,
  config: ApiConfig,
  session: Session,
): Promise<Response> {
  if (!config.publishingEnabled) throw new ApiError(503, 'publishing-disabled', 'Publishing is currently disabled.');
  const publisher = requirePublisherRow(session);
  const body = await readJsonBody(request);
  const parsed = publishBodySchema.safeParse(body);
  if (!parsed.success) throw invalid();
  const { clientKey } = parsed.data;
  // The derive step owns every content rejection: schema, vocabulary, title, byte bound.
  const derivation = await collection.derive(parsed.data.payload);
  if (derivation === null) throw invalid();

  const payloadJson = derivation.canonicalJson;
  const hash = derivation.contentHash;
  const owner = publisher.id;
  const name = collection.name;

  // Retry-key inspection first: the request record decides replay vs conflict vs gone.
  // A logically expired record is ignored entirely — retention is enforced by time,
  // not just by the periodic sweep.
  const nowMs = Date.now();
  const retry = await first<{ expires_at: number; payload_hash: string; publication_id: string | null }>(
    env,
    SQL.request,
    owner,
    name,
    clientKey,
  );
  if (retry !== null && retry.expires_at > nowMs) {
    if (retry.payload_hash !== hash) throw conflict('That key was used for a different payload.');
    if (retry.publication_id === null) {
      throw new ApiError(410, 'gone', 'That publication was removed.');
    }
    const entry = await entryById(collection, env, retry.publication_id);
    if (entry !== null) return json(200, entry, noStore);
  }

  const existing = await first<PublicationRow>(env, SQL.publicationByKey, owner, name, clientKey);
  if (existing !== null) {
    // A hidden entry is frozen for its owner too: replaying the create key must not
    // read as a live publication.
    if (existing.hidden_at !== null) throw forbidden('This entry is under moderation review.');
    if (existing.content_hash !== hash) throw conflict('That key was used for a different payload.');
    return json(200, rowToEntry(collection, existing), noStore);
  }

  const timestamp = now();
  const expiresAt = Date.now() + ARCHIVE_LIMITS.idempotencyRetentionMs;
  const tagsJson = JSON.stringify(derivation.tags);
  const results = await databaseCall(() =>
    env.DB.batch([
      env.DB.prepare(SQL.expireRequests).bind(Date.now()),
      env.DB.prepare(SQL.insertPublication).bind(
        uuid(),
        owner,
        name,
        clientKey,
        ARCHIVE_CONTRACT_VERSION,
        derivation.contentVersion,
        payloadJson,
        hash,
        derivation.filter,
        derivation.title,
        tagsJson,
        timestamp,
        timestamp,
        owner,
        name,
        ARCHIVE_LIMITS.maxPublications,
        owner,
        name,
        clientKey,
        Date.now(),
      ),
      env.DB.prepare(SQL.insertRequest).bind(
        owner,
        name,
        clientKey,
        hash,
        timestamp,
        expiresAt,
        owner,
        name,
        clientKey,
        hash,
      ),
    ]),
  );
  if ((results[1]?.meta?.changes ?? 0) === 0) {
    // The guarded insert was skipped: a race already wrote the key, the key's
    // publication was removed, or the owner's live-publication quota is full.
    // Re-reading the request record first distinguishes a tombstone from a race.
    const request = await first<{ expires_at: number; payload_hash: string; publication_id: string | null }>(
      env,
      SQL.request,
      owner,
      name,
      clientKey,
    );
    if (request !== null && request.expires_at > Date.now()) {
      if (request.publication_id === null) throw new ApiError(410, 'gone', 'That publication was removed.');
      if (request.payload_hash === hash) {
        const entry = await entryById(collection, env, request.publication_id);
        if (entry !== null) return json(200, entry, noStore);
        // The publication vanished between checks: the key is a tombstone.
        throw new ApiError(410, 'gone', 'That publication was removed.');
      }
      throw conflict('That key was used for a different payload.');
    }
    const raced = await first<PublicationRow>(env, SQL.publicationByKey, owner, name, clientKey);
    if (raced !== null && raced.hidden_at !== null) throw forbidden('This entry is under moderation review.');
    if (raced !== null && raced.content_hash === hash) return json(200, rowToEntry(collection, raced), noStore);
    if (raced !== null) throw conflict('That key was used for a different payload.');
    throw new ApiError(429, 'quota', 'Publication quota reached.');
  }

  const created = await first<PublicationRow>(env, SQL.publicationByKey, owner, name, clientKey);
  if (created === null) throw conflict();
  return json(201, rowToEntry(collection, created), noStore);
}

export async function updateEntry(
  collection: ArchiveCollection,
  request: Request,
  env: ArchiveWorkerEnv,
  config: ApiConfig,
  session: Session,
  id: string,
): Promise<Response> {
  if (!config.publishingEnabled) throw new ApiError(503, 'publishing-disabled', 'Publishing is currently disabled.');
  const publisher = requirePublisherRow(session);
  // The owner's row regardless of moderation state: the author must be told their
  // entry is frozen, not that it vanished.
  const row = await first<PublicationRow>(env, SQL.publicationAny, id, collection.name);
  // Replacing an entry is the author's alone; anyone else sees the entry as absent.
  if (row === null || row.owner_id !== publisher.id) throw notFound();
  // Hidden entries are frozen: an edit must not bypass the operator's decision.
  if (row.hidden_at !== null) throw forbidden('This entry is under moderation review.');

  const body = await readJsonBody(request);
  const parsed = updateBodySchema.safeParse(body);
  if (!parsed.success) throw invalid();
  const { expectedRevision } = parsed.data;

  if (expectedRevision !== row.revision) throw conflict();

  const derivation = await collection.derive(parsed.data.payload);
  if (derivation === null) throw invalid();
  const payloadJson = derivation.canonicalJson;
  const hash = derivation.contentHash;
  if (hash === row.content_hash) {
    const current = await first<PublicationRow>(env, SQL.publicationAny, id, collection.name);
    if (current === null || current.owner_id !== publisher.id) throw notFound();
    if (current.hidden_at !== null) throw forbidden('This entry is under moderation review.');
    if (current.revision !== expectedRevision) throw conflict();
    return json(200, rowToEntry(collection, current), noStore);
  }

  const tagsJson = JSON.stringify(derivation.tags);
  const result = await run(
    env,
    SQL.updatePublication,
    ARCHIVE_CONTRACT_VERSION,
    derivation.contentVersion,
    payloadJson,
    hash,
    derivation.filter,
    derivation.title,
    tagsJson,
    now(),
    id,
    publisher.id,
    expectedRevision,
    hash,
  );
  if ((result.meta?.changes ?? 0) === 0) {
    const current = await first<PublicationRow>(env, SQL.publicationAny, id, collection.name);
    if (current === null) throw notFound();
    if (current.hidden_at !== null) throw forbidden('This entry is under moderation review.');
    throw conflict();
  }
  const updated = await entryById(collection, env, id);
  if (updated === null) throw notFound();
  return json(200, updated, noStore);
}

export async function deleteEntry(
  collection: ArchiveCollection,
  env: ArchiveWorkerEnv,
  session: Session,
  id: string,
): Promise<Response> {
  // The owner's row regardless of moderation state: the author may still remove a
  // hidden entry (their content, their call) — hiding freezes edits, not removal.
  // Removing an entry is the author's alone; an operator may remove ANY entry — the
  // terminal moderation action for abusive content. The operator path carries the
  // same registered-publisher-row requirement every moderation route shares: one
  // accountable identity per action. Everyone else sees the entry as absent.
  if (session.operator) {
    const operator = requireOperatorRow(session);
    await databaseCall(() =>
      env.DB.batch([
        env.DB.prepare(SQL.auditRemoval).bind(uuid(), operator.id, now(), id, collection.name),
        env.DB.prepare(SQL.removePublicationAny).bind(id, collection.name),
      ]),
    );
  } else {
    const publisher = requirePublisherRow(session);
    const row = await first<PublicationRow>(env, SQL.publicationAny, id, collection.name);
    if (row === null) return new Response(null, { headers: noStore, status: 204 });
    if (row.owner_id !== publisher.id) throw notFound();
    await run(env, SQL.removePublication, id, publisher.id);
  }
  return new Response(null, { headers: noStore, status: 204 });
}

export async function setLike(
  collection: ArchiveCollection,
  env: ArchiveWorkerEnv,
  config: ApiConfig,
  session: Session,
  id: string,
  liked: boolean,
): Promise<Response> {
  const publisher = requirePublisherRow(session);
  if (liked && !config.likesEnabled) throw new ApiError(503, 'likes-disabled', 'Likes are currently disabled.');
  const row = await first<PublicationRow>(env, SQL.publication, id, collection.name);
  if (row === null) throw notFound();
  if (liked) {
    await run(env, SQL.insertLike, publisher.id, now(), id);
  } else {
    await run(env, SQL.removeLike, id, publisher.id);
  }
  // One consistent snapshot: the count and the viewer's flag read together.
  const state = await first<{ id: string; like_count: number; liked: number }>(env, SQL.likeState, publisher.id, id);
  if (state === null) throw notFound();
  const dto = { id: state.id, likeCount: state.like_count, liked: state.liked === 1 };
  const validated = archiveLikeStateSchema.safeParse(dto);
  if (!validated.success) throw recordUnavailable();
  return json(200, validated.data, noStore);
}

/* -------------------------------- moderation ------------------------------- */

// One free-text report reason: trimmed, non-empty, well-formed, bounded.
const reportBodySchema = s.object({
  reason: s.string().check(isWellFormedText).trim().min(1).max(ARCHIVE_LIMITS.reportReasonChars),
});

/**
 * A reader's abuse report against one visible entry. Idempotent per (entry, reporter):
 * reporting again is the same 204, never a duplicate row. Hidden or missing entries
 * are 404 — they cannot be reported, they are already actioned or gone.
 */
export async function reportEntry(
  collection: ArchiveCollection,
  request: Request,
  env: ArchiveWorkerEnv,
  session: Session,
  id: string,
): Promise<Response> {
  const reporter = requirePublisherRow(session);
  const body = await readJsonBody(request);
  const parsed = reportBodySchema.safeParse(body);
  if (!parsed.success) throw invalid();
  const row = await first<PublicationRow>(env, SQL.publication, id, collection.name);
  if (row === null) throw notFound();
  // Bound in the SQL's authored placeholder order: reporter, reason, created_at,
  // then the WHERE's entry id and collection.
  await run(env, SQL.insertReport, uuid(), reporter.id, parsed.data.reason, now(), id, collection.name);
  return new Response(null, { headers: noStore, status: 204 });
}

/**
 * The operator soft-hide: removes an entry from every public surface while keeping
 * the row, its likes and its retry key intact. Idempotent — already in the requested
 * state answers the same 204. Operator authority is the session's verified role
 * claim; a registered publisher row is still required (one accountable identity).
 */
export async function setHidden(
  collection: ArchiveCollection,
  env: ArchiveWorkerEnv,
  session: Session,
  id: string,
  hidden: boolean,
): Promise<Response> {
  const operator = requireOperatorRow(session);
  // Any collection row, visible or hidden: the operator acts on the storage row. The
  // pre-read establishes existence only. The transactional audit guard decides
  // whether the requested transition is an effective action.
  const row = await first<PublicationRow>(env, SQL.publicationAny, id, collection.name);
  if (row === null) throw notFound();
  const statement = hidden
    ? env.DB.prepare(SQL.hidePublication).bind(now(), id, collection.name)
    : env.DB.prepare(SQL.unhidePublication).bind(id, collection.name);
  await databaseCall(() =>
    env.DB.batch([
      env.DB.prepare(SQL.auditHide).bind(
        uuid(),
        operator.id,
        hidden ? 'hide' : 'unhide',
        now(),
        id,
        collection.name,
        Number(hidden),
      ),
      statement,
    ]),
  );
  return new Response(null, { headers: noStore, status: 204 });
}

/** The operator's report queue for one collection: newest first, bounded. */
export async function listReports(
  collection: ArchiveCollection,
  request: Request,
  env: ArchiveWorkerEnv,
  session: Session,
): Promise<Response> {
  requireOperatorRow(session);
  const status = new URL(request.url).searchParams.get('status') ?? 'unresolved';
  if (status !== 'unresolved' && status !== 'resolved') throw badRequest();
  const context = `reports:${collection.name}:${status}`;
  const { cursor, limit } = forwardPage(request, context, ['status']);
  const bound = reportsPageSql(
    { collection: collection.name, resolved: status === 'resolved' },
    { cursor, limit: limit + 1 },
  );
  const rows = await all<ReportRow>(env, bound.sql, ...bound.parameters);
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const parsed = archiveReportsSchema.safeParse({
    cursor:
      rows.length > limit && last !== undefined
        ? nextCursor({ createdAt: last.created_at, id: last.id }, context)
        : null,
    reports: page.map((row) => ({
      createdAt: row.created_at,
      entryId: row.publication_id,
      entryTitle: row.entry_title,
      id: row.id,
      reason: row.reason,
      reporter: { id: row.reporter_id, name: row.reporter_name },
      resolvedAt: row.resolved_at,
    })),
  });
  if (!parsed.success) throw recordUnavailable();
  return json(200, parsed.data, noStore);
}

interface ReportRow {
  collection: string;
  created_at: string;
  entry_title: string;
  id: string;
  publication_id: string;
  reason: string;
  reporter_id: string;
  reporter_name: string;
  resolved_at: string | null;
}

export async function resolveReport(
  collection: ArchiveCollection,
  env: ArchiveWorkerEnv,
  session: Session,
  id: string,
): Promise<Response> {
  requireOperatorRow(session);
  const row = await first<{ id: string }>(env, SQL.reportById, id, collection.name);
  if (row === null) throw notFound();
  await run(env, SQL.resolveReport, now(), id, collection.name);
  return new Response(null, { headers: noStore, status: 204 });
}

export async function myReports(request: Request, env: ArchiveWorkerEnv, session: Session): Promise<Response> {
  const context = `own-reports:${session.publisher?.id ?? 'unregistered'}`;
  const { cursor, limit } = forwardPage(request, context);
  if (session.publisher === null) return json(200, { cursor: null, reports: [] }, noStore);
  const bound = reportsPageSql({ publisherId: session.publisher.id }, { cursor, limit: limit + 1 });
  const rows = await all<ReportRow>(env, bound.sql, ...bound.parameters);
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const parsed = archiveOwnReportsSchema.safeParse({
    cursor:
      rows.length > limit && last !== undefined
        ? nextCursor({ createdAt: last.created_at, id: last.id }, context)
        : null,
    reports: page.map((row) => ({
      collection: row.collection,
      createdAt: row.created_at,
      entryId: row.publication_id,
      id: row.id,
      reason: row.reason,
      resolvedAt: row.resolved_at,
    })),
  });
  if (!parsed.success) throw recordUnavailable();
  return json(200, parsed.data, noStore);
}

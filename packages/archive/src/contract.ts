import { type InferOutput, type Schema, s } from '@vielzeug/spell';

/** Shared naming: one place so the client, Worker and issuer cannot drift. */
export const SESSION_COOKIE_NAME = 'archive_session';
export const SESSION_COOKIE_PATH = '/api/v1';
/**
 * The maximum age a session JWT may carry, and the cookie Max-Age an issuer sets:
 * a long-lived signed-in state. The Worker rejects older tokens at this bound.
 */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const OPERATOR_SESSION_MAX_AGE_SECONDS = 60 * 60;

/**
 * The full Set-Cookie value for the session cookie: name, token and the security
 * attributes every issuer and the Worker must agree on — HttpOnly, SameSite=Strict,
 * the contract Path, Max-Age, and Secure in production. Issuers mint with the
 * session's max age; the Worker and issuers clear with `maxAgeSeconds: 0`. Never
 * hand-compose the attributes: the cookie's CSRF and theft posture is contract,
 * not per-issuer choice.
 */
export const sessionCookieValue = (token: string, options: { maxAgeSeconds: number; secure: boolean }): string =>
  `${SESSION_COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=${SESSION_COOKIE_PATH}; Max-Age=${options.maxAgeSeconds}${options.secure ? '; Secure' : ''}`;

export const PUBLISHER_HEADER = 'x-archive-publisher';
/** Pins account erasure to the issuer account shown when confirmation began. */
export const ACCOUNT_HEADER = 'X-Archive-Account';
export const REQUEST_MARKER_HEADER = 'x-archive-request';
/** The wire-contract version advertised by health and stamped on every entry envelope. */
export const ARCHIVE_CONTRACT_VERSION = 1;
/**
 * The storage schema version: the `archive_schema_meta` stamp the package's migration
 * writes and the Worker reads back through health. A mismatch answers `degraded`
 * instead of `ok` — a stale database is the most likely deployment fault.
 */
export const ARCHIVE_SCHEMA_VERSION = 1;
/** Canonical issuer database initialization stamp. */
export const AUTH_SCHEMA_VERSION = 1;
/** The `roles` claim value a session JWT carries for operator authority (moderation). */
export const ARCHIVE_OPERATOR_ROLE = 'archive-operator';
/** The routable collection-name rule: lowercase `[a-z0-9-]`, at most 32 chars. */
export const ARCHIVE_COLLECTION_NAME_PATTERN = /^[a-z0-9-]{1,32}$/;

// Exported schemas carry explicit public `Schema<Output>` annotations: the concrete
// spell schema classes are not part of spell's public export surface, so inferred
// types would not be portable across package declaration files.
export const uuidSchema: Schema<string> = s.string().uuid();
export const isoTimestampSchema: Schema<string> = s.string().isoDateTime();
export const hex64Schema: Schema<string> = s.string().regex(/^[0-9a-f]{64}$/);
/** Well-formed user text: no lone UTF-16 surrogates, no C0/C1/DEL control characters. */
export const ILL_FORMED_TEXT = /[\p{Cs}\p{Cc}]/u;
export const isWellFormedText = (value: string): boolean => !ILL_FORMED_TEXT.test(value);
const textString = () => s.string().check(isWellFormedText);
/** The one alias rule, shared by identity mutations and every emitted DTO. */
export const archiveAliasSchema: Schema<string> = textString().trim().max(24);

export const archiveAuthorSchema: Schema<{ id: string; name: string }> = s.object({
  id: uuidSchema,
  name: archiveAliasSchema,
});
export const archiveIdentitySchema: Schema<{ id: string; name: string; operator: boolean } | null> = s
  .object({ id: uuidSchema, name: archiveAliasSchema, operator: s.boolean() })
  .nullable();
export type ArchiveIdentity = InferOutput<typeof archiveIdentitySchema>;
/** The issuer account metadata export; its id is the session subject, not a publisher id. */
export const archiveAccountSchema: Schema<{
  createdAt: string;
  email: string;
  id: string;
  lastSignInAt: string | null;
}> = s.object({
  createdAt: isoTimestampSchema,
  email: s.string().email(),
  id: uuidSchema,
  lastSignInAt: isoTimestampSchema.nullable(),
});
export type ArchiveAccount = InferOutput<typeof archiveAccountSchema>;
export const archiveLikedIdsSchema: Schema<{ ids: string[] }> = s.object({ ids: s.array(uuidSchema) });
export const archiveLikesPageSchema: Schema<{ cursor: string | null; ids: string[] }> = s.object({
  cursor: s.string().nullable(),
  ids: s.array(uuidSchema),
});
export type ArchiveLikesPage = InferOutput<typeof archiveLikesPageSchema>;
export const archiveLikeStateSchema: Schema<{ id: string; likeCount: number; liked: boolean }> = s.object({
  id: uuidSchema,
  likeCount: s.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  liked: s.boolean(),
});

/** Application bounds shared by handlers, the health route, and clients. */
export const ARCHIVE_LIMITS = Object.freeze({
  aliasChars: 24,
  cursorChars: 1024,
  idempotencyRetentionMs: 48 * 60 * 60 * 1000,
  likeStateIds: 50,
  maxPageSize: 50,
  maxPublications: 50,
  pageSize: 10,
  payloadBytes: 8192,
  publicCacheSeconds: 30,
  /** One free-text moderation reason: trimmed, non-empty, at most this many chars. */
  reportReasonChars: 256,
  requestBytes: 12 * 1024,
  searchChars: 64,
  searchTerms: 6,
  tagsPerEntry: 16,
  titleChars: 128,
  /** One declared filter or tag value: well-formed, non-empty, at most this many chars. */
  vocabChars: 64,
});
export const archiveLimitsSchema: Schema<{
  aliasChars: number;
  cursorChars: number;
  idempotencyRetentionMs: number;
  likeStateIds: number;
  maxPageSize: number;
  maxPublications: number;
  pageSize: number;
  payloadBytes: number;
  publicCacheSeconds: number;
  reportReasonChars: number;
  requestBytes: number;
  searchChars: number;
  searchTerms: number;
  tagsPerEntry: number;
  titleChars: number;
  vocabChars: number;
}> = s.object({
  aliasChars: s.number().int().min(1),
  cursorChars: s.number().int().min(1),
  idempotencyRetentionMs: s.number().int().min(1),
  likeStateIds: s.number().int().min(1),
  maxPageSize: s.number().int().min(1),
  maxPublications: s.number().int().min(1),
  pageSize: s.number().int().min(1),
  payloadBytes: s.number().int().min(1),
  publicCacheSeconds: s.number().int().min(0),
  reportReasonChars: s.number().int().min(1),
  requestBytes: s.number().int().min(1),
  searchChars: s.number().int().min(1),
  searchTerms: s.number().int().min(1),
  tagsPerEntry: s.number().int().min(1),
  titleChars: s.number().int().min(1),
  vocabChars: s.number().int().min(1),
});
export const archiveHealthSchema: Schema<{
  /** The storage schema stamp (`archive_schema_meta`) the database actually carries. */
  dbSchemaVersion: number | null;
  features: { likes: boolean; publishing: boolean };
  limits: InferOutput<typeof archiveLimitsSchema>;
  schemaVersion: 1;
  /** 'degraded' when the database's storage schema does not match the Worker's. */
  status: 'ok' | 'degraded';
  reason: 'database-unavailable' | 'schema-mismatch' | null;
}> = s.object({
  dbSchemaVersion: s.number().int().min(0).nullable(),
  features: s.object({ likes: s.boolean(), publishing: s.boolean() }),
  limits: archiveLimitsSchema,
  reason: s.enum(['database-unavailable', 'schema-mismatch'] as const).nullable(),
  schemaVersion: s.literal(ARCHIVE_CONTRACT_VERSION),
  status: s.enum(['ok', 'degraded'] as const),
});
export type ArchiveHealth = InferOutput<typeof archiveHealthSchema>;

export const archiveAuthHealthSchema: Schema<{
  dbSchemaVersion: number | null;
  schemaVersion: 1;
  status: 'ok' | 'degraded';
  reason: 'configuration-unavailable' | 'database-unavailable' | 'schema-mismatch' | null;
}> = s.object({
  dbSchemaVersion: s.number().int().min(0).nullable(),
  reason: s.enum(['configuration-unavailable', 'database-unavailable', 'schema-mismatch'] as const).nullable(),
  schemaVersion: s.literal(AUTH_SCHEMA_VERSION),
  status: s.enum(['ok', 'degraded'] as const),
});
export type AuthHealth = InferOutput<typeof archiveAuthHealthSchema>;

/** The Worker's full error-code vocabulary — the contract both sides test against. */
export const ARCHIVE_ERROR_CODES = [
  'account-changed',
  'auth-unavailable',
  'bad-request',
  'conflict',
  'forbidden',
  'gone',
  'internal',
  'invalid-payload',
  'likes-disabled',
  'method-not-allowed',
  'not-found',
  'publisher-changed',
  'publishing-disabled',
  'quota',
  'rate-limited',
  'record-unavailable',
  'timeout',
  'too-large',
  'unauthenticated',
  'unavailable',
  'unsupported-media',
] as const;
export type ArchiveErrorCode = (typeof ARCHIVE_ERROR_CODES)[number];

/**
 * The error envelope every route answers failures with: `{ error: { code, message,
 * requestId } }`. Clients validate against this one schema — an envelope carrying an
 * unknown code or malformed fields is not an archive error at all.
 */
export const archiveErrorResponseSchema: Schema<{
  error: { code: ArchiveErrorCode; message: string; requestId: string };
}> = s
  .object({
    error: s
      .object({
        code: s.enum(ARCHIVE_ERROR_CODES),
        message: s.string().min(1).max(256),
        requestId: uuidSchema,
      })
      .strict(),
  })
  .strict();
export type ArchiveErrorResponse = InferOutput<typeof archiveErrorResponseSchema>;

/** The sign-out acknowledgement: the only non-collection response body, shared by both sides. */
export const archiveOkSchema: Schema<{ ok: true }> = s.object({ ok: s.literal(true) }).strict();

/** One collection's public self-description: its name and declared query vocabularies. */
export const archiveCollectionMetaSchema: Schema<{
  filters: string[];
  name: string;
  tags: string[];
}> = s.object({
  filters: s.array(s.string().min(1).max(ARCHIVE_LIMITS.vocabChars)),
  name: s.string().regex(ARCHIVE_COLLECTION_NAME_PATTERN),
  tags: s.array(s.string().min(1).max(ARCHIVE_LIMITS.vocabChars)),
});
export type ArchiveCollectionMeta = InferOutput<typeof archiveCollectionMetaSchema>;

/** One reader report an operator reviews: what was reported, why, and by whom. */
export const archiveReportsSchema: Schema<{
  cursor: string | null;
  reports: {
    id: string;
    createdAt: string;
    entryId: string;
    entryTitle: string;
    reason: string;
    reporter: { id: string; name: string };
    resolvedAt: string | null;
  }[];
}> = s.object({
  cursor: s.string().nullable(),
  reports: s.array(
    s.object({
      createdAt: isoTimestampSchema,
      entryId: uuidSchema,
      entryTitle: s.string().min(1).max(ARCHIVE_LIMITS.titleChars),
      id: uuidSchema,
      reason: s.string().min(1).max(ARCHIVE_LIMITS.reportReasonChars),
      reporter: archiveAuthorSchema,
      resolvedAt: isoTimestampSchema.nullable(),
    }),
  ),
});
export type ArchiveReports = InferOutput<typeof archiveReportsSchema>;
export const archiveOwnReportsSchema: Schema<{
  cursor: string | null;
  reports: {
    collection: string;
    createdAt: string;
    entryId: string;
    id: string;
    reason: string;
    resolvedAt: string | null;
  }[];
}> = s.object({
  cursor: s.string().nullable(),
  reports: s.array(
    s.object({
      collection: s.string().regex(ARCHIVE_COLLECTION_NAME_PATTERN),
      createdAt: isoTimestampSchema,
      entryId: uuidSchema,
      id: uuidSchema,
      reason: s.string().min(1).max(ARCHIVE_LIMITS.reportReasonChars),
      resolvedAt: isoTimestampSchema.nullable(),
    }),
  ),
});
export type ArchiveOwnReports = InferOutput<typeof archiveOwnReportsSchema>;

/** The moderation actions an operator can take; the audit log's whole vocabulary. */
export const ARCHIVE_MODERATION_ACTIONS = ['hide', 'unhide', 'remove', 'erase-publisher'] as const;
export type ArchiveModerationAction = (typeof ARCHIVE_MODERATION_ACTIONS)[number];

/**
 * The operator accountability log: one row per effective moderation action, newest
 * first. Operator and target travel as opaque ids only — no names (they change), no
 * content — so the log stays honest after renames and survives the erasures it records.
 */
export const archiveModerationLogSchema: Schema<{
  cursor: string | null;
  actions: {
    id: string;
    action: ArchiveModerationAction;
    collection: string | null;
    createdAt: string;
    operatorId: string;
    targetId: string;
  }[];
}> = s.object({
  actions: s.array(
    s.object({
      action: s.enum(ARCHIVE_MODERATION_ACTIONS),
      collection: s.string().regex(ARCHIVE_COLLECTION_NAME_PATTERN).nullable(),
      createdAt: isoTimestampSchema,
      id: uuidSchema,
      operatorId: uuidSchema,
      targetId: uuidSchema,
    }),
  ),
  cursor: s.string().nullable(),
});
export type ArchiveModerationLog = InferOutput<typeof archiveModerationLogSchema>;

/** How the online list ranks entries: explicit modes only, no vague composites. */
export type ArchiveSort = 'liked' | 'recent';
export const archiveSortSchema: Schema<ArchiveSort> = s.enum(['liked', 'recent'] as const);

/**
 * One page of archive entries. Every list in the package pages forward-only: the
 * cursor walks toward the oldest entry and is null after the last page.
 */
export interface ArchivePage<T> {
  /** Cursor for the next page; null after the last. */
  cursor: string | null;
  entries: readonly T[];
}

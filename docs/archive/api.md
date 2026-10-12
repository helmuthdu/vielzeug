---
title: "Archive: API Reference"
description: "Collection definitions, browser-safe wire schemas, Worker deployment, and identity issuance."
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `defineArchiveCollection` | Compose validation, indexing, identity and wire schemas | Sync | Invalid content derives to `null`; callback faults throw |
| `createArchiveWorker` | Build the catalog Worker | Sync | Collection names must be unique |
| `createAuthWorker` | Build the passwordless issuer | Sync | `AUTH_ARCHIVE` is required |
| `worker.tap`, `issuer.tap` | Observe sanitized runtime outcomes | Sync | Neither core logs by default; observer exceptions are swallowed |
| `ArchiveDerivationError` | Identify a collection implementation/runtime fault | Sync | Faults become sanitized 500s, not content-validation 422s |
| `ARCHIVE_LIMITS` | Shared application bounds | Sync | Page bounds do not cap total exports |
| `archiveErrorResponseSchema`, `archiveAuthHealthSchema` | Validate error and issuer-health responses | Sync | Unknown error codes and health states reject |
| `ArchiveError`, `ArchiveDefinitionError` | Public base and invalid-definition errors | Sync | Thrown locally, not transmitted as error objects |
| `sessionCookieValue` | Compose shared session-cookie attributes | Sync | Deployments must choose `secure` from their environment |
| `isWellFormedText` | Check control characters and lone surrogates | Sync | Does not trim or impose a length bound |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/archive` | Browser-safe collections, constants, schemas and errors |
| `@vielzeug/archive/worker` | Catalog factory, issuer-session service binding and event types |
| `@vielzeug/archive/auth` | Issuer factory, operator lifetime and binding types |

## Collections

### `defineArchiveCollection`

Creates a frozen collection and its contract; malformed names, versions or vocabularies throw `ArchiveDefinitionError`.

```ts
function defineArchiveCollection<
  P extends object, const C extends number, const F extends string = never, const T extends string = never,
>(definition: ArchiveCollectionDefinition<P, C, F, T>): ArchiveCollection<P, C>;
```

| Parameter | Contract |
| --- | --- |
| `name` | Lowercase `[a-z0-9-]{1,32}` |
| `contentVersion` | Positive safe integer |
| `payloadSchema` | Spell schema whose output is a stable JSON object |
| `filters`, `tags` | Optional readonly arrays; omitted means empty vocabulary |
| `canonicalize` | Optional pure, idempotent, schema-valid normalization |
| `index` | Derive `filter`, `tags` and searchable `title` without mutating the payload |

**Returns:** `ArchiveCollection<P, C>`.

**Example:** define and derive one collection without Worker bindings.

```ts
import { defineArchiveCollection } from '@vielzeug/archive';
import { s } from '@vielzeug/spell';

const recipes = defineArchiveCollection({
  name: 'recipes',
  contentVersion: 1,
  payloadSchema: s.object({ name: s.string().min(1).max(32) }),
  index: (payload) => ({ filter: null, tags: [], title: payload.name }),
});
const derived = await recipes.derive({ name: 'Rice' });
if (derived === null) throw new Error('Invalid recipe');
console.log(derived.contentHash);
```

| Method / property | Result |
| --- | --- |
| `derive(raw)` | `Promise<ArchiveDerivation \| null>` |
| `contract.entry` | Public entry schema |
| `contract.ownedEntry`, `ownedEntries` | Owner view with `clientKey` and `hidden` |
| `contract.page` | Entries and forward/backward cursors |
| `contract.publishInput`, `updateInput` | Publish and revision-guarded update request schemas |
| `filters`, `tags` | Frozen vocabulary snapshots |

`derive` returns `null` for invalid JSON objects, schema-invalid input, invalid titles, too many tags and oversized canonical payloads. Unexpected schema, callback or hashing failures throw `ArchiveDerivationError`. Non-idempotent or schema-invalid canonicalization, unstable schema transformations, index mutation and out-of-vocabulary projections are also derivation faults. Routes map `null` to 422 `invalid-payload` and faults to a sanitized 500 `internal`.
Schema output that is lossy or no longer JSON is a derivation fault, not invalid
submitted content. Invalid index-result shapes also throw.

Const generics preserve the content-version literal and infer filter/tag unions from vocabulary arrays without `as const`. `NoInfer` prevents `index` from widening those unions; omitted arrays infer `never`, permitting only `filter: null` and empty tags.

Objects serialize with recursively sorted keys; arrays preserve order unless your canonicalizer changes it. SHA-256 hashes the core-owned `{contentVersion, payload}` envelope. Response schemas require stored payloads to remain stable under parsing; a response-validation fault has stage `response`.

`filter`, tags and searchable title are persisted projections, not computed during reads. Changing `index` or its vocabulary does not update stored rows. The active definition and persisted dataset must remain consistent; Archive has no projection-update or historical-schema API.

## Worker and Maintenance

### `createArchiveWorker`

Returns the catalog request/scheduled handler and its observation side channel.

```ts
function createArchiveWorker<E extends ArchiveWorkerEnv>(
  collections: readonly ArchiveCollection[],
): ArchiveWorkerHandler<E>;
```

**Returns:** `ArchiveWorkerHandler<E>`; duplicate names throw `ArchiveDefinitionError` at registration.

**Example:** export a deployable Worker using the package's structural bindings.

```ts
import { defineArchiveCollection } from '@vielzeug/archive';
import { createArchiveWorker, type ArchiveWorkerEnv } from '@vielzeug/archive/worker';
import { s } from '@vielzeug/spell';

const notes = defineArchiveCollection({
  name: 'notes', contentVersion: 1,
  payloadSchema: s.object({ title: s.string().min(1).max(128) }),
  index: ({ title }) => ({ title, filter: null, tags: [] }),
});
export default createArchiveWorker<ArchiveWorkerEnv>([notes]);
```

| Method | Contract |
| --- | --- |
| `fetch(request, env, ctx)` | Returns `Promise<Response>` |
| `scheduled(controller, env, ctx)` | Sweeps expired retry keys and revocation tombstones; emits failures and rethrows |
| `tap(handler, { signal? }?)` | Returns unsubscribe; a pre-aborted signal registers nothing |

`AUTH_ISSUER_SERVICE` is a required `fetch`-shaped service binding to the issuer.
The catalog verifies the signed JWT locally, then asks the issuer to validate its
current account session version. It does not cache successful issuer verdicts.
If the service exchange fails or exceeds its fixed 5000 ms timeout (body decoding
included), the catalog returns `503 auth-unavailable`; the timeout does not cancel
work already started by the issuer.

Only anonymous entry lists can use the 30-second edge cache. Any `Cookie` or `Authorization` header disables caching, even if invalid or empty. Detail, metadata, private and error responses are `no-store`. Public reads do not verify sessions.

---

### `worker.tap`

Observes typed request, scheduled and cache-failure events without affecting request behavior.

```ts
tap(handler: (event: ArchiveEvent) => void, options?: { readonly signal?: AbortSignal }): () => void;
```

**Returns:** an unsubscribe function; abort detaches the observer. Diagnostics contain categories and trusted configuration field names, never raw errors, SQL, subjects, aliases, tokens or URLs.

**Example:** observe a Worker and detach explicitly.

```ts
import { createArchiveWorker, type ArchiveWorkerEnv } from '@vielzeug/archive/worker';

const worker = createArchiveWorker<ArchiveWorkerEnv>([]);
const stop = worker.tap((event) => console.log(JSON.stringify(event)));
stop();
```

---

## Identity Issuer

### `createAuthWorker`

Returns the passwordless email issuer with account export and coordinated erasure.

```ts
function createAuthWorker<E extends AuthWorkerEnv>(): AuthWorkerHandler<E>;
```

**Returns:** `AuthWorkerHandler<E>`.

**Example:** export an issuer configured through deployment bindings.

```ts
import { createAuthWorker, type AuthWorkerEnv } from '@vielzeug/archive/auth';

export default createAuthWorker<AuthWorkerEnv>();
```

| Method | Contract |
| --- | --- |
| `fetch(request, env, ctx?)` | Returns `Promise<Response>` |
| `scheduled(controller, env, ctx?)` | Removes expired links, closed send windows and unverified unreferenced accounts |
| `tap(handler, { signal? }?)` | Observes typed `AuthEvent`; returns unsubscribe; pre-aborted signals are inert |

Magic links expire after 15 minutes and work once. The durable per-email budget allows three sends per hour; consumption, expiration and send failure do not refund it. Ordinary sessions last at most 30 days. Operator sessions use `OPERATOR_SESSION_MAX_AGE_SECONDS` (900 seconds). `OPERATOR_EMAILS` controls newly minted role claims.

The issuer-global admission budget is durable D1 state in `auth_sign_in_budget`:
20 requests per 60-second window before account creation or email delivery.
This supplements, rather than replaces, the durable per-email budget. No external
rate-limiter binding is required.
Admission spends are not refunded after later database or email failures.
Request emails are trimmed and lowercased before validation. `SENDER_ADDRESS`
must already be canonical; `OPERATOR_EMAILS` entries are trimmed and lowercased
before validation.

Sign-in requests create pending account rows with `lastSignInAt: null`. Successful
redemption atomically claims the one-use link and stamps the account's sign-in
time. The sweep deletes expired links and closed per-user send windows, then
unverified accounts with neither remaining links nor send-budget references.
Verified accounts are retained until explicit account deletion.

`@vielzeug/archive/auth` exports `OPERATOR_SESSION_MAX_AGE_SECONDS = 900` alongside
the factory and issuer binding types.

`AUTH_JWT_PREVIOUS_PUBLIC_JWKS` optionally publishes retired public RS256 keys and verifies sessions minted before rotation; private members reject configuration. The package has no demo sign-in routes.

Opening a magic link performs a safe GET that displays a click-confirmation page,
not redemption. Only a marked POST from an exact allowed origin or
`PUBLIC_ORIGIN` consumes `{ token }` and returns 204 with the session cookie. The
confirmation page navigates to `/signed-in` after success; the POST is not a
redirect. Confirmation responses are `no-store` with no-referrer and restrictive
CSP; the page removes the token from the address bar and loads no external assets.
GET displays confirmation for any syntactically valid token, including a used
token; only POST establishes whether the link is still redeemable. POST accepts
exactly `{ token }` and rejects query parameters.

The issuer never logs directly. `tap` emits sanitized request and scheduled
outcomes; observer failures are swallowed, abort detaches the observer and failed
scheduled work emits then rethrows. `AuthDiagnostic` reports only a category.

## HTTP Routes

Every route below is mounted under `/api/v1`. Mutation guards require an exact allowed `Origin` and `x-archive-request: 1`. Registered publishers pin `x-archive-publisher` to the identity captured when preparing private requests. The header is a freshness precondition, not authority.

| Route | Contract |
| --- | --- |
| `GET /health` | Public catalog readiness; 200 `ok` or 503 `degraded` |
| `POST /sign-out` | Catalog-local sign-out; `{ ok: true }` and expired session cookie, without issuer access |
| `GET /collections/:collection` | Collection metadata |
| `GET /collections/:collection/entries` | `author`, `filter`, `tag`, `search`, `sort`, `cursor`, `limit`; bidirectional entry page |
| `POST /collections/:collection/entries` | `{ clientKey, payload }`; 201 create or 200 replay |
| `GET /collections/:collection/entries/:id` | Public entry; always `no-store` |
| `PUT /collections/:collection/entries/:id` | Owner-only `{ expectedRevision, payload }` |
| `DELETE /collections/:collection/entries/:id` | Owner or operator removal; 204 |
| `PUT` / `DELETE /collections/:collection/entries/:id/like` | Like / unlike visible entries only; guarded write and response; like-state response |
| `POST /collections/:collection/entries/:id/report` | `{ reason }`; idempotent per entry/reporter; 204 |
| `PUT` / `DELETE /collections/:collection/entries/:id/hidden` | Operator hide / unhide; 204 |
| `GET /collections/:collection/reports` | Operator page; `status=unresolved` (default) or `resolved`, `cursor`, `limit` |
| `PUT /collections/:collection/reports/:id/resolved` | Operator resolves report by its unique report ID; idempotent 204 |
| `DELETE /publishers/:id` | Operator erases Archive profile; not issuer account |
| `GET /moderation-log` | Operator forward page; `cursor`, `limit` |
| `GET` / `POST` / `PUT /me` | Identity, register with optional `{ name }`, rename with required `{ name }` |
| `DELETE /me` | Profile-only cascade; 204; does not clear cookie |
| `DELETE /me/account` | Revoke issuer/subject and atomically erase profile; 204; coordinated issuer-erasure seam |
| `GET /me/publications?collection=…` | Owner entries including hidden state and retry keys |
| `GET /me/likes` | Forward page `{ ids, cursor }`; `cursor`, `limit` |
| `GET /me/likes?ids=…` | Subset lookup `{ ids }`; at most `likeStateIds` input IDs |
| `GET /me/reports` | Own forward report page across collections; `cursor`, `limit` |
| `GET /auth/health` | Public issuer readiness; typed `AuthHealth`, 200 `ok` or 503 `degraded`; no email or peer probe |
| `GET /auth/session` | Internal issuer-session check for the catalog service binding; exact `{ ok: true }`, `no-store`, no PII; 401 for an invalid, stale or absent-account session |
| `POST /auth/sign-out-all` | Requires marker, exact origin, session and captured `ACCOUNT_HEADER`; atomically increments `session_version`, deletes outstanding links, preserves account and catalog data; 200 `{ ok: true }` with an expired cookie only on durable success |
| `GET /auth/jwks.json` | Active and configured retired public verification keys |
| `POST /auth/sign-in` | `{ email }` (trimmed and lowercased); 202 `{ ok: true }` |
| `GET /auth/verify?token=…` | Safe no-store click-confirmation page; no token consumption or session change |
| `POST /auth/verify` | JSON `{ token }`, marker and exact allowed origin or `PUBLIC_ORIGIN`; consume once; 204 with session cookie |
| `GET /auth/account` | `{ id, email, createdAt, lastSignInAt }`; no tokens or budget data |
| `DELETE /auth/account` | Requires `ACCOUNT_HEADER` with the captured issuer account UUID; catalog `/me/account` via `AUTH_ARCHIVE`, require exact 204, then issuer user and cookie clear; 204 |

Forward pages are newest first with opaque context-bound keyset cursors. Keep the same query context when following a cursor; end at `cursor: null`. `maxPageSize` bounds each page, not the total number of liked IDs, reports or audit actions you can export. The subset-like query is not a page and cannot combine `ids` with `cursor` or `limit`.

Full erasure creates an issuer/subject revocation tombstone for 30 days plus ten
seconds and deletes the profile in the same transaction. Catalog authentication
rejects that subject with 401 on ordinary private routes; registration also checks
revocation in SQL to prevent resurrection races. Only `DELETE /me/account` may
bypass the issuer session lookup, and only to retry erasure with the original
signed session of the same principal while its existing revocation tombstone is
valid; JWT signature and claims are still verified. It is not a general
stale-session exception: initial erasure validates the issuer session. The
issuer-facing `DELETE /auth/account` always checks the current session version
before calling the catalog, so retrying it after completed erasure returns 401
because the account is absent.
Direct profile-only `DELETE /me` allows later registration using the same session.
The sweep removes expired tombstones. Re-enrollment through the reference issuer
creates a fresh account UUID subject; an external issuer must issue a new subject
to re-enroll during the revocation window.

The issuer stores `auth_users.session_version` as a safe non-negative integer,
defaulting to `0`. Every session JWT carries the current value as the required
`sessionVersion` claim. Each ordinary issuer-authenticated route compares that
claim to the current account row; a mismatch is unauthenticated. `POST
/api/v1/auth/sign-out-all` checks the captured issuer account UUID against the
verified subject before atomically incrementing the version and deleting pending
links. A changed account answers 409 `account-changed`; a failed request does not
clear the cookie. This revokes all sessions, including the caller's, after a
successful response. Requests authorized before revocation may finish; there is
no cross-database transactional or in-flight cancellation guarantee.

The catalog requires `AUTH_ISSUER_SERVICE`, a service binding to the issuer. After
local JWT signature/claims verification, it requests
`GET /api/v1/auth/session` through that binding on every private request. Only a
strictly validated 401 `unauthenticated` remains a 401. Malformed, unexpected,
provider and 5xx responses become 503 `auth-unavailable`; there is no authority
cache. Both service directions use a fixed 5000 ms timeout that includes body
decoding. The issuer's `/api/v1/auth/session` is an internal
service contract, not a frontend session API.

Issuer readiness is independent of catalog readiness. `GET
/api/v1/auth/health` returns `archiveAuthHealthSchema` as `AuthHealth`; its
read-only probe checks configuration, a signing and verification key proof,
binding shapes, the singleton `auth_schema_meta` stamp against
`AUTH_SCHEMA_VERSION`, and readability of expected tables, columns and triggers.
It does not write, send email or probe the catalog service. Responses are
sanitized.
Configuration failure, database failure and schema mismatch return HTTP 503
with `status: 'degraded'` and the corresponding reason.

Effective hide, unhide, operator removal and publisher erasure append audit rows atomically with the state transition. Concurrent idempotent no-ops append nothing. Audit rows contain opaque IDs, not names or content, and have no foreign keys so they outlive erasure. Resolving a report sets `resolvedAt`; it is not one of the four audit action kinds.

## Constants and Schemas

| Export | Value or parsed output |
| --- | --- |
| `ARCHIVE_CONTRACT_VERSION`, `ARCHIVE_SCHEMA_VERSION` | Both debut at `1`; wire and storage versions are independent |
| `AUTH_SCHEMA_VERSION` | `1`; issuer DDL stamp checked by `/auth/health` |
| `ARCHIVE_COLLECTION_NAME_PATTERN` | `/^[a-z0-9-]{1,32}$/` |
| `ARCHIVE_OPERATOR_ROLE` | `'archive-operator'` |
| `SESSION_COOKIE_NAME`, `SESSION_COOKIE_PATH` | `'archive_session'`, `'/api/v1'` |
| `SESSION_MAX_AGE_SECONDS` | `2592000` |
| `OPERATOR_SESSION_MAX_AGE_SECONDS` | `900`; shared root contract, also re-exported by `/auth` |
| `ACCOUNT_HEADER` | `'X-Archive-Account'`; required issuer-account UUID on coordinated erasure |
| `PUBLISHER_HEADER`, `REQUEST_MARKER_HEADER` | `'x-archive-publisher'`, `'x-archive-request'` |
| `ILL_FORMED_TEXT`, `isWellFormedText(value: string): boolean` | Reject control characters and lone UTF-16 surrogates |
| `uuidSchema`, `isoTimestampSchema`, `hex64Schema` | UUID, ISO timestamp, lowercase SHA-256 hex strings |
| `archiveAliasSchema` | Trimmed, well-formed alias of at most 24 characters |
| `archiveAuthorSchema` | `{ id: string; name: string }` |
| `archiveIdentitySchema` | `ArchiveIdentity` |
| `archiveAccountSchema` | `ArchiveAccount`; issuer metadata, excluding private fields |
| `archiveLimitsSchema` | All numeric `ARCHIVE_LIMITS` fields |
| `archiveHealthSchema` | `ArchiveHealth` |
| `archiveAuthHealthSchema` | `AuthHealth` |
| `archiveErrorResponseSchema` | `ArchiveErrorResponse` |
| `archiveOkSchema` | `{ ok: true }` |
| `archiveCollectionMetaSchema` | `ArchiveCollectionMeta` |
| `archiveLikedIdsSchema` | `{ ids: string[] }` subset response |
| `archiveLikesPageSchema` | `ArchiveLikesPage` |
| `archiveLikeStateSchema` | `{ id: string; likeCount: number; liked: boolean }` |
| `archiveReportsSchema`, `archiveOwnReportsSchema` | `ArchiveReports`, `ArchiveOwnReports` |
| `archiveModerationLogSchema` | `ArchiveModerationLog` |
| `archiveSortSchema` | `ArchiveSort` |
| `ARCHIVE_ERROR_CODES` | Values of `ArchiveErrorCode` below |
| `ARCHIVE_MODERATION_ACTIONS` | `['hide', 'unhide', 'remove', 'erase-publisher']` |

### `sessionCookieValue`

Composes a session cookie using the shared security attributes.

```ts
function sessionCookieValue(token: string, options: { maxAgeSeconds: number; secure: boolean }): string;
```

| Parameter | Contract |
| --- | --- |
| `token` | Session token, or empty string when clearing |
| `options.maxAgeSeconds` | Cookie lifetime; `0` clears it |
| `options.secure` | Include `Secure` for production HTTPS |

**Returns:** the `Set-Cookie` value with `HttpOnly`, `SameSite=Strict`, the shared path and optional `Secure`.

**Example:** clear the production cookie.

```ts
import { sessionCookieValue } from '@vielzeug/archive';

const expiredCookie = sessionCookieValue('', { maxAgeSeconds: 0, secure: true });
console.log(expiredCookie);
```

---

### `isWellFormedText`

Checks text for control characters and lone UTF-16 surrogates.

```ts
function isWellFormedText(value: string): boolean;
```

**Returns:** `true` when `ILL_FORMED_TEXT` does not match; it does not trim or impose bounds.

**Example:** validate text independently of the alias schema.

```ts
import { isWellFormedText } from '@vielzeug/archive';

console.log(isWellFormedText('Rice'), isWellFormedText('\u0000'));
```

### `ARCHIVE_LIMITS`

`ARCHIVE_LIMITS` is frozen with these values:

```ts
const limits = {
  aliasChars: 24, cursorChars: 1024, idempotencyRetentionMs: 172800000,
  likeStateIds: 50, maxPageSize: 50, maxPublications: 50, pageSize: 10,
  payloadBytes: 8192, publicCacheSeconds: 30, reportReasonChars: 256,
  requestBytes: 12288, searchChars: 64, searchTerms: 6, tagsPerEntry: 16,
  titleChars: 128, vocabChars: 64,
};
```

## Types

The following definitions use `Schema` from `@vielzeug/spell`. Schema-derived aliases show their complete output shape.

```ts
interface ArchiveIndexing<F extends string = string, T extends string = string> {
  filter: F | null;
  tags: readonly T[];
  title: string;
}
interface ArchiveCollectionDefinition<
  P extends object, C extends number, F extends string = never, T extends string = never,
> {
  canonicalize?(payload: P): P;
  contentVersion: C;
  filters?: readonly F[];
  index(payload: P): ArchiveIndexing<NoInfer<F>, NoInfer<T>>;
  name: string;
  payloadSchema: Schema<P, unknown>;
  tags?: readonly T[];
}
interface ArchiveDerivation {
  canonicalJson: string;
  contentHash: string;
  contentVersion: number;
  filter: string | null;
  tags: readonly string[];
  title: string;
}
interface ArchiveEntry<P = unknown, C extends number = number> {
  author: { id: string; name: string };
  contentHash: string;
  contentVersion: C;
  id: string;
  likeCount: number;
  payload: P;
  publishedAt: string;
  revision: number;
  schemaVersion: typeof ARCHIVE_CONTRACT_VERSION;
  updatedAt: string;
}
interface ArchiveOwnedEntry<P = unknown, C extends number = number> extends ArchiveEntry<P, C> {
  clientKey: string;
  hidden: boolean;
}
interface ArchiveContract<P = unknown, C extends number = number> {
  entry: Schema<ArchiveEntry<P, C>>;
  ownedEntries: Schema<{ entries: ArchiveOwnedEntry<P, C>[] }>;
  ownedEntry: Schema<ArchiveOwnedEntry<P, C>>;
  page: Schema<ArchivePage<ArchiveEntry<P, C>>>;
  publishInput: Schema<{ clientKey: string; payload: P }, unknown>;
  updateInput: Schema<{ expectedRevision: number; payload: P }, unknown>;
}
interface ArchiveCollection<P extends object = object, C extends number = number> {
  readonly contentVersion: C;
  readonly contract: ArchiveContract<P, C>;
  readonly derive: (raw: unknown) => Promise<ArchiveDerivation | null>;
  readonly filters: readonly string[];
  readonly name: string;
  readonly tags: readonly string[];
}
interface ArchivePage<T> {
  cursor: string | null;
  entries: readonly T[];
  previous: string | null;
}
type ArchiveSort = 'liked' | 'recent';
type ArchiveDerivationStage = 'schema' | 'canonicalize' | 'index' | 'hash' | 'response';
type ArchiveIdentity = { id: string; name: string; operator: boolean } | null;
type ArchiveAccount = {
  id: string; email: string; createdAt: string; lastSignInAt: string | null;
};
type ArchiveCollectionMeta = { filters: string[]; name: string; tags: string[] };
type ArchiveLikesPage = { cursor: string | null; ids: string[] };
type ArchiveErrorCode =
  | 'account-changed' | 'auth-unavailable' | 'bad-request' | 'conflict' | 'forbidden' | 'gone'
  | 'internal' | 'invalid-payload' | 'likes-disabled' | 'method-not-allowed'
  | 'not-found' | 'publisher-changed' | 'publishing-disabled' | 'quota'
  | 'rate-limited' | 'record-unavailable' | 'timeout' | 'too-large'
  | 'unauthenticated' | 'unavailable' | 'unsupported-media';
type ArchiveErrorResponse = {
  error: { code: ArchiveErrorCode; message: string; requestId: string };
};
type ArchiveHealth = {
  dbSchemaVersion: number | null;
  features: { likes: boolean; publishing: boolean };
  limits: {
    aliasChars: number; cursorChars: number; idempotencyRetentionMs: number;
    likeStateIds: number; maxPageSize: number; maxPublications: number;
    pageSize: number; payloadBytes: number; publicCacheSeconds: number;
    reportReasonChars: number; requestBytes: number; searchChars: number;
    searchTerms: number; tagsPerEntry: number; titleChars: number; vocabChars: number;
  };
  schemaVersion: 1;
  status: 'ok' | 'degraded';
  reason: 'database-unavailable' | 'schema-mismatch' | null;
};
type AuthHealth = {
  dbSchemaVersion: number | null;
  schemaVersion: 1;
  status: 'ok' | 'degraded';
  reason: 'configuration-unavailable' | 'database-unavailable' | 'schema-mismatch' | null;
};
type ArchiveReports = {
  cursor: string | null;
  reports: {
    id: string; createdAt: string; entryId: string; entryTitle: string;
    reason: string; reporter: { id: string; name: string }; resolvedAt: string | null;
  }[];
};
type ArchiveOwnReports = {
  cursor: string | null;
  reports: {
    collection: string; createdAt: string; entryId: string; id: string;
    reason: string; resolvedAt: string | null;
  }[];
};
type ArchiveModerationAction = 'hide' | 'unhide' | 'remove' | 'erase-publisher';
type ArchiveModerationLog = {
  cursor: string | null;
  actions: {
    id: string; action: ArchiveModerationAction; collection: string | null;
    createdAt: string; operatorId: string; targetId: string;
  }[];
};
```

Worker subpath types model only the binding methods the catalog calls.

```ts
interface D1Statement {
  all<T>(): Promise<{ results?: T[] }>;
  bind(...params: (string | number | null)[]): D1Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta?: { changes?: number } }>;
}
interface D1Like {
  batch(statements: D1Statement[]): Promise<{ meta?: { changes?: number } }[]>;
  prepare(sql: string): D1Statement;
}
interface RateLimiterBinding {
  limit(input: { key: string }): Promise<{ success: boolean }>;
}
interface ArchiveWorkerEnv {
  AUTH_ISSUER_SERVICE: AuthIssuerServiceBinding;
  ALLOWED_ORIGINS: string;
  APP_ENV: string;
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
interface AuthIssuerServiceBinding {
  fetch(request: Request): Promise<Response>;
}
interface ArchiveExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}
type ArchiveDiagnostic =
  | { readonly kind: 'configuration'; readonly field: string }
  | { readonly kind: 'database' | 'record' | 'schema' | 'internal' | 'cache' | 'collection' };
interface ArchiveRequestEvent {
  code: ArchiveErrorCode | 'ok';
  diagnostic?: ArchiveDiagnostic;
  ms: number;
  requestId: string;
  route: string;
  status: number;
  type: 'request';
}
type ArchiveScheduledEvent =
  | { removed: number; type: 'scheduled'; status: 'ok' }
  | { type: 'scheduled'; status: 'failed'; diagnostic: ArchiveDiagnostic };
type ArchiveEvent =
  | ArchiveRequestEvent
  | ArchiveScheduledEvent
  | { readonly type: 'cache-error'; readonly diagnostic: ArchiveDiagnostic };
interface ArchiveWorkerHandler<E extends ArchiveWorkerEnv = ArchiveWorkerEnv> {
  fetch(request: Request, env: E, ctx: ArchiveExecutionContext): Promise<Response>;
  scheduled?(controller: unknown, env: E, ctx: ArchiveExecutionContext): void | Promise<void>;
  tap(handler: (event: ArchiveEvent) => void, options?: { readonly signal?: AbortSignal }): () => void;
}
```

Scheduled `removed` counts the combined expired retry-key and revocation rows.

Auth subpath types describe the sibling issuer and its required service binding.

```ts
interface SendEmail {
  send(message: { from: string; html?: string; subject: string; text: string; to: string }): Promise<unknown>;
}
interface AuthArchiveBinding {
  fetch(request: Request): Promise<Response>;
}
interface AuthWorkerEnv {
  ALLOWED_ORIGINS: string;
  APP_ENV: string;
  APP_NAME: string;
  AUDIENCE: string;
  AUTH_ARCHIVE: AuthArchiveBinding;
  AUTH_DB: D1Like;
  AUTH_EMAIL: SendEmail;
  AUTH_ISSUER: string;
  AUTH_JWT_PREVIOUS_PUBLIC_JWKS?: string;
  AUTH_JWT_PRIVATE_JWK: string;
  OPERATOR_EMAILS: string;
  PUBLIC_ORIGIN: string;
  SENDER_ADDRESS: string;
}
interface AuthWorkerHandler<E extends AuthWorkerEnv = AuthWorkerEnv> {
  fetch(request: Request, env: E, ctx?: ArchiveExecutionContext): Promise<Response>;
  scheduled(controller: unknown, env: E, ctx?: ArchiveExecutionContext): Promise<void>;
  tap(handler: (event: AuthEvent) => void, options?: { readonly signal?: AbortSignal }): () => void;
}
type AuthDiagnostic = {
  readonly kind: 'configuration' | 'database' | 'email' | 'catalog' | 'internal';
};
type AuthEvent =
  | {
      readonly type: 'request';
      readonly requestId: string;
      readonly route:
        | '/auth/account'
        | '/auth/health'
        | '/auth/jwks.json'
        | '/auth/session'
        | '/auth/sign-in'
        | '/auth/sign-out-all'
        | '/auth/verify'
        | 'unmatched';
      readonly status: number;
      readonly code: ArchiveErrorCode | 'ok';
      readonly ms: number;
      readonly diagnostic?: AuthDiagnostic;
    }
  | { readonly type: 'scheduled'; readonly status: 'ok'; readonly removed: number }
  | { readonly type: 'scheduled'; readonly status: 'failed'; readonly diagnostic: AuthDiagnostic };
```

Issuer scheduled `removed` counts expired token rows, closed per-user send windows
and deleted unverified accounts. The singleton admission row is retained and its
window resets atomically on a later sign-in request.

## Errors

| Exported class | Trigger | Properties |
| --- | --- | --- |
| `ArchiveError` | Base for public package errors | `name`, `message`, optional `cause` |
| `ArchiveDefinitionError` | Invalid collection definition or duplicate registered collection names | Extends `ArchiveError` |
| `ArchiveDerivationError` | Unexpected schema/canonicalization/index/hash/response fault or violated collection invariant | Extends `ArchiveError`; readonly `stage: ArchiveDerivationStage`; optional `cause` |

`ArchiveError` and `ArchiveDefinitionError` accept `(message: string, opts?: ErrorOptions)`.
`ArchiveDerivationError` accepts `(stage: ArchiveDerivationStage, message: string, opts?: ErrorOptions)`.
Its message and cause are local diagnostics, not response content. Worker request
failures use the wire envelope, not these thrown classes. Internal `ApiError` and
`AuthOperationError` are not exported.

Stored entries that fail the current wire schema return 503 `record-unavailable`.
Unexpected exceptions in the collection's response-payload callbacks instead
throw `ArchiveDerivationError` with stage `response` and become sanitized 500s.

The complete public error signatures are:

```ts
class ArchiveError extends Error {
  constructor(message: string, opts?: ErrorOptions);
}
class ArchiveDefinitionError extends ArchiveError {}
class ArchiveDerivationError extends ArchiveError {
  readonly stage: ArchiveDerivationStage;
  constructor(stage: ArchiveDerivationStage, message: string, opts?: ErrorOptions);
}
```

Catalog rate-limit responses use `Retry-After: 60`; configure catalog limiter periods to 60 seconds. Issuer admission/send-budget responses instead carry seconds until their durable window reopens. Health's degraded response is the health DTO, not an error envelope: schema mismatch reports the observed version; database unavailability reports `dbSchemaVersion: null`.

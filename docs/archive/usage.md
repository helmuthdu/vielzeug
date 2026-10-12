---
title: "Archive: Usage Guide"
description: "Define a collection, initialize fresh D1 databases, deploy the Workers, and wire your client and observation policy."
---

[[toc]]

## Basic Usage

A deployment is a collection definition plus one factory call. Put the definition in a
module both sides import — the browser needs the composed schemas, the Worker needs
the collection itself.

```ts
// recipes-collection.ts — the one content contract, shared by both sides.
import { defineArchiveCollection } from '@vielzeug/archive';
import { s } from '@vielzeug/spell';

const payloadSchema = s.object({
  cuisine: s.enum(['italian', 'japanese']),
  ingredients: s.array(s.string().trim().min(1).max(64)).min(1).max(20),
  name: s.string().trim().min(1).max(32),
});

export const recipesCollection = defineArchiveCollection({
  // Ingredient order is not identity: the canonical form sorts, so reordered
  // content hashes identically and updates as a no-op.
  canonicalize: (payload) => ({ ...payload, ingredients: [...payload.ingredients].sort() }),
  contentVersion: 1,
  filters: ['italian', 'japanese'],
  index: (payload) => ({
    filter: payload.cuisine,
    tags: [payload.ingredients.length <= 5 ? 'quick' : 'involved'],
    title: payload.name,
  }),
  name: 'recipes',
  payloadSchema,
  tags: ['quick', 'involved'],
});
```

The Worker entry imports the collection and exports the built handler:

```ts
// backend/src/index.ts — the whole deployment.
import { createArchiveWorker } from '@vielzeug/archive/worker';
import { recipesCollection } from './recipes-collection';

const worker = createArchiveWorker([recipesCollection]);

// One sanitized log line per request: ids, codes and route classes only.
worker.tap((event) => console.log(JSON.stringify(event)));

export default worker;
```

The browser imports the same collection for its schemas — never the worker subpath:

```ts
import { recipesCollection } from './recipes-collection';
import { archiveIdentitySchema, PUBLISHER_HEADER } from '@vielzeug/archive';

const response = await fetch('/api/v1/collections/recipes/entries');
if (!response.ok) throw new Error('Archive unavailable');
const page = recipesCollection.contract.page.parse(await response.json());
const meResponse = await fetch('/api/v1/me', { credentials: 'same-origin' });
if (!meResponse.ok) throw new Error('Identity unavailable');
const me = archiveIdentitySchema.parse(await meResponse.json());
if (me === null) throw new Error('Register a publisher first');
const mineResponse = await fetch('/api/v1/me/publications?collection=recipes', {
  credentials: 'same-origin', headers: { [PUBLISHER_HEADER]: me.id },
});
if (!mineResponse.ok) throw new Error('Own publications unavailable');
const owned = recipesCollection.contract.ownedEntries.parse(await mineResponse.json());
console.log(page.entries, owned.entries);
```

## The collection contract

`defineArchiveCollection` is the only place content knowledge lives. The definition is
validated at registration — a bad `name`, `contentVersion`, or any vocabulary value
(well-formed text, 1..`vocabChars` chars) throws there, never mid-request — and every
ordinary invalid content returns `null` → `422 invalid-payload`. Collection
implementation faults instead throw `ArchiveDerivationError` → sanitized
`500 internal`:

- **Parse** — accept stable JSON objects only; schema outputs must remain JSON.
- **Canonicalize** — optional; a result that leaves the payload schema throws, so a
  broken normalizer can never store invalid content.
- **Index** — the returned `filter` must be declared in `filters`, every `tag` in
  `tags` (duplicates collapse), and the `title` is trimmed and bounded
  (`titleChars`, well-formed text). A derivation outside the declared vocabulary
  would store a row no list query can reach — it throws instead.
- **Size** — the canonical JSON must fit `payloadBytes`.
- **Identity** — the content hash is SHA-256 over `{contentVersion, payload}`:
  identical content hashes identically, a real edit always re-identifies, and the
  core owns the envelope so collections cannot drift it.

Declare vocabularies with readonly arrays (`['fire', 'ice']`) for automatic
literal-union inference. Const generics retain the version literal and vocabulary
unions; `NoInfer` prevents the index callback from widening them. Omitted arrays
mean empty vocabularies: return `null` for
the filter and no tags. Object keys are recursively sorted by the core; schema
transformations must stabilize and `canonicalize` must be pure and idempotent.
Non-JSON input returns `null`. Unexpected callback, schema or hashing failures,
unstable transformations, non-idempotent canonicalization and index mutation throw
`ArchiveDerivationError`; its `stage` identifies the failing phase.
Lossy or non-JSON schema output and invalid index-result shapes also throw.

`contentVersion` participates in content identity. Request handling validates
only the current collection definition; it does not interpret historical schemas.
Archive provides no content-upgrade APIs: a new definition never reinterprets
stored rows.

Filters, tags and searchable titles are persisted data derived at publish/update
time. Editing `index` or its vocabularies does not recompute existing projections.
Keep the active definition and dataset consistent. For a development
deployment, deliberately reset and reseed a fresh database when you change payload
or projection semantics; the package does not supply a migration framework.
Resetting destroys existing data. Perform it only as an explicit, deliberate
development operation, not automatically during startup or deployment.

**Payloads carry decisions, not content.** The payload schema should accept
user-authored choices expressed as IDs plus user-written text — never the content's
own copyrighted expression (card text, artwork, rules), never more than the game's
own identifiers. For games with paid or DLC content this is the whole answer:
ownership resolves on each viewer's device against their own library, the service
never learns what anyone owns, and the strict schema is the enforcement seam —
use a strict schema that rejects unknown fields, so a collection that only models IDs cannot
accidentally start shipping paid content. For example, published game builds can
reference cards, equipment and potions by ID plus a user-written name. The client
renders pieces the viewer does not own as unavailable. Keep the browser-safe
publication contract in a shared domain module consumed by both the frontend and
its backend, without importing frontend application code into the Worker.

## The Worker and its environment

`createArchiveWorker(collections)` returns the full handler: anonymous public reads,
cookie-authenticated mutations behind exact-origin and request-marker guards, local
RS256/JWKS verification followed by an uncached issuer session-version check,
per-IP read limits and per-subject write limits keyed by peppered HMACs, the
30-second anonymous cache on public entry lists only, operator moderation, and a
scheduled expiry sweep for retired publish retry keys and revocation tombstones.
Health sits outside the rate-limit and session pipelines: probes never burn the
anonymous read budget or call the issuer.

The Worker reads its environment fail-closed — every binding must be present and
well-formed, or the route answers 503 without naming what is missing:

| Variable                 | Meaning                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `APP_ENV`                | `local` or `production` (transport rules and the pepper policy)   |
| `ALLOWED_ORIGINS`        | Exact canonical origins; never wildcards                          |
| `JWT_ISSUER` / `JWT_AUDIENCE` / `JWT_JWKS_URL` | Your identity provider |
| `AUTH_ISSUER_SERVICE`    | Required issuer service binding for live session-version checks   |
| `LIKES_ENABLED` / `PUBLISHING_ENABLED`        | Feature flags                     |
| `RATE_LIMIT_KEY_SECRET`  | HMAC pepper. Required ≥ 32 chars in production; local may fall back |
| `DB` / `READ_LIMIT` / `WRITE_LIMIT`           | D1 + rate-limit bindings |

Both limiter bindings must run 60-second windows (`simple` limiters:
`period: 60`): the platform binding does not expose its period at runtime, so the
Worker's 429 `Retry-After` header is fixed at 60 seconds — a longer window would
make the header lie.

Generated Env types (wrangler's `worker-configuration.d.ts`) satisfy the package's
structural `ArchiveWorkerEnv` — no `@cloudflare/workers-types` dependency, no casts.

## The auth issuer

`createAuthWorker()` from `@vielzeug/archive/auth` is the reference passwordless
identity issuer a deployment runs beside the catalog Worker: one POST with an email
sends a single-use magic link, and explicitly confirming it sets the `archive_session`
cookie. The catalog verifies the JWT locally, then calls the issuer through
`AUTH_ISSUER_SERVICE` to check the account's current session version. Requests create
pending account rows; explicit link redemption atomically stamps the account's
sign-in time and claims the token. The issuer's D1 schema ships at
`node_modules/@vielzeug/archive/migrations/auth/`; point the issuer's
`migrations_dir` there. The catalog's `JWT_ISSUER` and `JWT_JWKS_URL` must identify
the issuer, and its audience must match the issuer's `AUDIENCE`.

| Variable | Meaning |
| --- | --- |
| `APP_NAME` | The app's display name: the magic-link email's subject and copy name it |
| `ALLOWED_ORIGINS` | Exact origins allowed to trigger unsafe routes (the app origin(s)) |
| `APP_ENV` | `local` or `production` — production requires HTTPS and sets Secure cookies |
| `AUDIENCE` / `AUTH_ISSUER` | The claims every minted session carries; the catalog verifies the same pair |
| `AUTH_DB` / `AUTH_EMAIL` | The issuer's D1 and send-email bindings |
| `AUTH_ARCHIVE` | Required service binding to the catalog Worker; deletion calls its profile-erasure route |
| `AUTH_JWT_PRIVATE_JWK` | The RS256 private key as a JWK JSON string: a wrangler secret in production |
| `AUTH_JWT_PREVIOUS_PUBLIC_JWKS` | Optional retired public RS256 JWKS; publish during rotation until old sessions expire |
| `OPERATOR_EMAILS` | Comma-separated emails whose newly minted sessions carry the operator role |
| `PUBLIC_ORIGIN` | App origin for links, confirmation POST origin checks and client navigation after sign-in |
| `SENDER_ADDRESS` | The address magic links come from: a domain onboarded to Cloudflare Email Service |

Under `wrangler dev` the send-email binding is simulated — the link prints to the
issuer's console, so that console is the inbox. Demo-only Alice/Bob routes are
deployment wrappers, not package APIs.

The issuer first admits sign-in requests through its singleton durable
`auth_sign_in_budget` table: 20 requests per 60 seconds before creating accounts
or delivering email. No rate-limiter binding is required. It then
permits three sign-in emails per email in an hourly durable window.
Later database or delivery failures do not refund global admission.
Using or expiring a link never refunds sends; failed delivery also spends the
allowance. Links expire after 15 minutes. Operator sessions expire after 900
seconds, ordinary sessions after at most 30 days. Retain retired public keys during
rotation; the active private key signs every new session. Sign-in input trims and
lowercases email before validation. `SENDER_ADDRESS` must already be canonical;
`OPERATOR_EMAILS` entries are trimmed and lowercased before validation.

The scheduled sweep deletes expired links and closed per-user send windows, then
pending accounts only when neither a link nor send-budget row still references
them. Failed delivery deletes the unusable token but retains the spent allowance;
it does not immediately remove the pending account. Verified accounts stay until
explicit erasure. The singleton admission row remains and resets its window on a
later admitted request.

Opening `GET /auth/verify?token=…` renders a no-store confirmation page and does
not consume the link or change the session, so email scanners cannot sign in by
fetching it. A deliberate click sends `POST /auth/verify` with JSON `{ token }`,
the request marker and an exact allowed origin or `PUBLIC_ORIGIN`.
Success is 204 with Set-Cookie; the page then navigates to `/signed-in`. The
redemption update and account sign-in stamp are trigger-backed and atomic.
The page removes the token from the address bar, loads no external assets, and
sets a restrictive CSP and `Referrer-Policy: no-referrer`.

`GET /auth/account` exports account metadata only. For full erasure, call
`DELETE /auth/account` with `ACCOUNT_HEADER` (`X-Archive-Account`) set to the
issuer account UUID captured from `GET /auth/account` before confirmation.
The issuer rejects missing or invalid UUIDs with 400 and a different signed-in
account with 409 `account-changed`, before any erasure. This guard applies even
before publisher registration and must stay pinned across retries.
The issuer forwards the caller's session and publisher
precondition through `AUTH_ARCHIVE` to `DELETE /me/account`, requires exactly 204,
then deletes its
own user and clears the cookie. Failure preserves the session for retry. Direct
`DELETE /me` removes only the Archive profile and leaves the cookie intact.

Several game frontends can share one issuer and catalog. Keep the cookie
host-only on the central API host, use `credentials: 'include'` from same-site
HTTPS game subdomains, and allow each exact frontend origin in both Workers.
Do not share cookies through a parent-domain `Domain` attribute. The
[multi-collection recipe](./examples/multi-collection-deployment.md) describes
the topology, session revalidation and platform-wide account boundary.

`DELETE /me/account` atomically revokes the issuer/subject and cascades profile
deletion. Its tombstone lasts 30 days plus ten seconds; old sessions cannot read
private data or register again, including a racing registration. The dedicated
account-erasure route alone may bypass the issuer lookup, and only to retry with
the same principal's original signed session while its existing tombstone is
valid; signature and claims are still verified, and initial erasure validates the
issuer. The issuer's `DELETE /auth/account` checks the current version before
starting erasure; after completed erasure a retry there returns 401. A fresh
issuer account gets a new UUID subject. External issuers must use a new subject to
re-enroll during the revocation window. Profile-only deletion does not revoke the
subject and permits re-registration with existing credentials.

Each JWT also carries the issuer account's required safe-integer `sessionVersion`.
The issuer compares it with `auth_users.session_version` on every ordinary
authenticated route. A JWT with an old version is unauthenticated even before its
expiry; the catalog asks the issuer on every private request and does not cache a
successful verdict. A valid local JWT with an unavailable, malformed, 5xx or
timed-out (fixed 5000 ms, including body decoding) issuer response becomes
`503 auth-unavailable`, not anonymous identity.

## The database

The package ships the canonical catalog migration:
`node_modules/@vielzeug/archive/migrations/0001_community_archive.sql` — the whole schema,
moderation included, as one designed file. The runtime SQL in the package is
written against exactly this schema, and the package's own integration suite runs
against the same file. Point wrangler at the directory:

```jsonc
// wrangler.jsonc — the deployment owns its D1 database, not its DDL.
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "my-app",
      "migrations_dir": "./node_modules/@vielzeug/archive/migrations"
    }
  ]
}
```

The issuer points to
`node_modules/@vielzeug/archive/migrations/auth/0001_auth.sql`. Both files are
fresh-database initialization definitions, not upgrades. The issuer DDL initializes
`auth_users.session_version` to `0` and stamps `auth_schema_meta.applied` as
`AUTH_SCHEMA_VERSION` (`1`). Neither file automatically deletes or resets data.
Archive's canonical initial schemas are edited directly. Reset and reseed a
development database deliberately when its schema or collection semantics no
longer match; reapplying the initial file does not update an existing dataset.
The initialization file also stamps the storage schema
(`archive_schema_meta`) at `ARCHIVE_SCHEMA_VERSION`, and health reads it back: a
database with a mismatched stamp answers `status: 'degraded'` with the
observed `dbSchemaVersion` and HTTP 503 (`reason: 'schema-mismatch'`).
An unavailable database produces HTTP 503 with `dbSchemaVersion: null` and
`reason: 'database-unavailable'`. The debut storage stamp is `1`. A unit
test pins the shipped DDL's `CHECK` bounds to `ARCHIVE_LIMITS`, so the two can never
drift silently. The stamp does not detect changes in your collection's payload
schema, vocabulary or indexing function; you own that dataset consistency.

## Routes and wire names

```
GET    /api/v1/health
POST   /api/v1/sign-out
GET    /api/v1/auth/health
GET    /api/v1/auth/session                              (internal issuer check)
POST   /api/v1/auth/sign-out-all                         (revoke every session)
GET    /api/v1/collections/:collection                        (self-description)
GET    /api/v1/collections/:collection/entries                (author, filter, tag, search, sort, cursor, limit)
POST   /api/v1/collections/:collection/entries
GET    /api/v1/collections/:collection/entries/:id
PUT    /api/v1/collections/:collection/entries/:id            (expectedRevision)
DELETE /api/v1/collections/:collection/entries/:id
PUT    /api/v1/collections/:collection/entries/:id/like
DELETE /api/v1/collections/:collection/entries/:id/like
POST   /api/v1/collections/:collection/entries/:id/report     (reason)
PUT    /api/v1/collections/:collection/entries/:id/hidden     (operator)
DELETE /api/v1/collections/:collection/entries/:id/hidden     (operator)
GET    /api/v1/collections/:collection/reports               (operator: status, cursor, limit)
PUT    /api/v1/collections/:collection/reports/:id/resolved  (operator: report ID)
DELETE /api/v1/publishers/:id                               (operator: erase any publisher)
GET    /api/v1/moderation-log                               (operator: cursor, limit)
GET    /api/v1/me             POST /me    PUT /me    DELETE /me
GET    /api/v1/me/publications?collection=:collection     GET /api/v1/me/likes[?ids=…]
GET    /api/v1/me/reports                                   (cursor, limit)
GET    /api/v1/auth/account
GET    /api/v1/auth/jwks.json
POST   /api/v1/auth/sign-in                                 (email)
DELETE /api/v1/auth/account                                (coordinated full erasure)
DELETE /api/v1/me/account                                  (issuer erasure seam; revokes subject)
GET    /api/v1/auth/verify?token=…                          (confirmation only)
POST   /api/v1/auth/verify                                 (guarded {token} redemption)
```

Publishing is bounded by `maxPublications` live entries per `(collection, owner)`.
The quota check runs inside the guarded insert.

Every list — entry pages, `/me/likes` without `ids`, `/me/reports`, operator
reports and `/moderation-log` — pages forward-only: follow `cursor` until `null`,
preserving query context; a cursor minted for another query is a 400. `limit`
defaults to `pageSize` and is at most `maxPageSize`; there is no total export
bound. `/me/likes?ids=…` remains a subset lookup returning `{ ids }`, not a
page, and cannot combine `ids` with `cursor` or `limit`.

Shared wire names live in the package — `archive_session` cookie,
`x-archive-publisher` and `x-archive-request` headers, `ARCHIVE_ERROR_CODES`, and
`ARCHIVE_LIMITS` — so a client and the Worker cannot drift. Parse failures with the
collection's composed schemas; parse errors with `archiveErrorResponseSchema`, the
sign-out body with `archiveOkSchema`, a collection's self-description with
`archiveCollectionMetaSchema` and the operator queue with `archiveReportsSchema`.
Every entry's `schemaVersion` is the archive contract's version, not the
collection's; the collection's own format version lives in its hash envelope and in
each entry's `contentVersion`.

Only anonymous entry lists carry a 30-second edge-cache contract
(`publicCacheSeconds`). Detail is always `no-store`. Any Cookie or Authorization
header disables caching, regardless of validity; metadata, private and error
responses also use `no-store`.

Implement UI ownership checks in your application by comparing the current
publisher ID to the entry's `author.id`; there is no package action-policy helper.
Server mutations remain authoritative.

`POST /api/v1/sign-out` is deliberately local: it clears only this browser's
cookie and does not contact the issuer or revoke copied sessions. To revoke every
session, post to `/api/v1/auth/sign-out-all` with the mutation marker, an exact
allowed `Origin`, and the issuer account UUID captured from
`GET /api/v1/auth/account` in `X-Archive-Account`. The issuer returns 409
`account-changed` if the active subject differs. On success it atomically increments
`session_version`, deletes outstanding links, preserves account and catalog data,
and returns `{ ok: true }` with an expired cookie. Requests authorized before
revocation may finish; there is no cross-database cancellation guarantee.

`GET /api/v1/auth/health` is public and read-only. It validates issuer
configuration, key signing/verification, binding shapes, the `auth_schema_meta`
stamp and expected tables, columns and triggers, returns `AuthHealth` through
`archiveAuthHealthSchema`, and answers 503 `degraded` for configuration,
database or schema failures. It never writes, sends email or probes the catalog.

## Moderation

Operator authority is the session token's optional `roles` claim carrying
`ARCHIVE_OPERATOR_ROLE` (`'archive-operator'`) — minted by your issuer, verified with
the same signature, audience and issuer checks as any session, and never a separate
credential. Moderation routes additionally require a registered publisher row: one
accountable identity per action.

- **Report** — any registered publisher reports a visible entry with a bounded
  free-text reason (`reportReasonChars`). Idempotent per (entry, reporter): the same
  report twice is the same 204. Missing or hidden entries answer 404 — there is
  nothing left to report.
- **Hide** — an operator removes an entry from every public surface (list, detail,
  likes) with a soft-hide: the row, its likes and its retry key stay intact. The
  owner still sees the entry in `/me/publications` with `hidden: true`, edits and
  key replay are frozen (403), removal stays allowed, and unhiding restores
  everything. Already hidden or already visible answer the same 204.
- **Queue** — the operator pages newest reports with entry title and reporter
  identity; `status` is `unresolved` (default) or `resolved`. Each report has its
  own `id` and nullable `resolvedAt`. Resolve it with
  `PUT /collections/:collection/reports/:id/resolved`; repeating is a 204 no-op.
- **Log** — every effective moderation action (hide, unhide, removal, publisher
  erasure) appends one accountability row in the same transaction that applies it,
  and `GET /api/v1/moderation-log` pages the newest actions to
  operators. Rows carry only ids, the action kind and the time — no names (they
  change), no content — and no foreign keys: the audit must outlive the erasures it
  records. Idempotent repeats (hiding an already-hidden entry, erasing an
  already-erased publisher) answer the same 204 with no new row, including
  concurrent repeats: audit insertion tests the effective state inside the batch.

Like and unlike both require a visible entry. Their SQL guards visibility during
the mutation, and the response checks it again; hiding or deleting an entry
cannot turn a racing unlike into a successful response for unavailable content.

## Observability

The core never logs. `worker.tap(handler, { signal? })` emits one `ArchiveEvent` per
request — `{ type: 'request', code, ms, requestId, route, status, diagnostic? }` —
and successful sweep — `{ type: 'scheduled', status: 'ok', removed }`. Failed
sweeps emit `{ type: 'scheduled', status: 'failed', diagnostic }` and rethrow so
the runtime sees failure. Cache failures emit `{ type: 'cache-error', diagnostic }`.
The Worker swallows observer errors so
observability cannot affect the Worker. With no handlers registered there is zero
work. Route is a finite class like `/collections/:collection/entries`, never a
raw path; no event carries a URL, cookie, subject, alias or token. Diagnostics are
typed sanitized categories, not raw exceptions. A pre-aborted tap signal is inert.
The sweep's `removed` counts expired retry keys and revocation tombstones together.

The issuer also exposes `tap()` with `AuthEvent` from `@vielzeug/archive/auth`.
It never logs directly. Events contain finite route labels, codes, counts,
duration and sanitized `AuthDiagnostic` categories, never emails, tokens or raw
exceptions. Scheduled failures emit then rethrow; pre-aborted taps are inert.
Issuer sweep counts include expired tokens, closed per-user send windows and
removed pending accounts; the singleton admission row is not removed.

```ts
import { createLogger } from '@vielzeug/rune';
import { createArchiveWorker } from '@vielzeug/archive/worker';
import { recipesCollection } from './recipes-collection';

const log = createLogger({ namespace: 'recipes' });
const worker = createArchiveWorker([recipesCollection]);
worker.tap((event) => log.debug(event, `archive:${event.type}`));
export default worker;
```

## Testing

The package proves itself against real workerd + local D1:

```sh
pnpm vitest run packages/archive/src/__tests__/          # fast unit suite
pnpm --filter @vielzeug/archive test:integration         # real workerd + local D1 + issuer coverage
pnpm --filter @vielzeug/archive test:types               # strict types over src and the integration suite
```

Prove your own collection the way the reference deployment does: a slim deployment
suite that publishes over your real vocabulary and asserts the derivation, plus the
package's generic suite for the core behavior. A collection with an `index` that can
drift out of vocabulary should unit-test `derive` directly: ordinary invalid input
returns `null`, while implementation faults throw `ArchiveDerivationError`.
Direct DDL tests exercise the shipped schema rather than a duplicate schema.

## Framework Integration

The root entry is plain TypeScript with no framework coupling; Vue, React and Svelte
apps all consume the composed schemas the same way. A Vue 3 composable that pages a
collection:

```ts
// useRecipes.ts — one collection's typed client in any component tree.
import { recipesCollection } from './recipes-collection';
import { ref, shallowRef } from 'vue';

export function useRecipes() {
  const entries = shallowRef<ReturnType<typeof recipesCollection.contract.entry.parse>[]>([]);
  const cursor = ref<string | null>(null);
  async function load(sort: 'liked' | 'recent') {
    const params = new URLSearchParams({ sort });
    if (cursor.value !== null) params.set('cursor', cursor.value);
    const response = await fetch(`/api/v1/collections/recipes/entries?${params}`);
    if (!response.ok) throw new Error('The archive is unavailable.');
    const page = recipesCollection.contract.page.parse(await response.json());
    entries.value = [...entries.value, ...page.entries];
    cursor.value = page.cursor;
  }
  return { cursor, entries, load };
}
```

## Working with Other Vielzeug Libraries

- [Spell](/spell/) — the payload schema a collection declares; the core composes the
  envelope schemas from it, so the wire and the types cannot drift.
- [Courier](/courier/) — the HTTP client shape an app's frontend mirrors to consume
  these routes: strict response schemas over one typed port.
- [Rune](/rune/) — the structured logger a deployment points `tap()` events at.

## Best Practices

- Compose client schemas from `collection.contract`; never hand-write the envelope.
- Declare exactly the vocabulary your `index` derives, with union types where you
  have them; a value outside it rejects loudly.
- Keep `canonicalize` pure and schema-true: reordered lists in, canonical form out.
- Initialize fresh databases with the shipped DDL and deliberately reset/reseed
  development data when collection or storage semantics change.
- Treat `ARCHIVE_ERROR_CODES` and `archiveErrorResponseSchema` as one tested contract.
- Pin the expected-publisher header from the identity you captured at sign-in, never from storage alone.
- Grant the operator role claim only through your issuer, and only to accounts that
  are also registered publishers.
- Wire a sanitized `tap()` sink and register the rate-limit pepper as a production secret.

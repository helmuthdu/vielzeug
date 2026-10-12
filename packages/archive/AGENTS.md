# AGENTS.md: Archive

Community content publishing for Cloudflare Workers + D1: a hardened catalog Worker
core over per-collection payload schemas, plus the reference passwordless identity
issuer that mints the sessions it verifies. Consumers are deployments (the two
server subpaths) and their browsers (the root contract).

## Public surfaces

- **Root `@vielzeug/archive` is browser-safe by contract**: schemas, constants, the
  collection seam (`defineArchiveCollection`), and public errors. UI ownership
  checks belong to consuming applications; do not add a shared action policy. Never import
  `./worker` or `./auth` code from it, and never move D1/JWKS/worker machinery into
  `src/` root modules — the split is the boundary that keeps client bundles
  server-free.
- **`@vielzeug/archive/worker`** is the catalog Worker factory subpath;
  **`@vielzeug/archive/auth`** is the identity issuer factory subpath. Keep
  `package.json` `exports`, `typesVersions`, and `vite.config.ts`'s entry map aligned
  (three entries: `src/index.ts`, `src/worker.ts`, `src/auth.ts`).
- **No IIFE bundle** and no REPL examples: `archive` is in `REPL_EXCLUDED_PACKAGES`
  (`scripts/vielzeug-packages.ts`) because the registry generator inlines every
  non-excluded package's IIFE, and the sandbox cannot host D1/JWKS bindings.

## Database ownership

- `migrations/0001_community_archive.sql` is the canonical catalog D1 schema — base,
  moderation (the report queue AND the `moderation_actions` audit log) and the storage
  stamp in one file; the runtime SQL in `src/worker/sql.ts` is written against exactly
  that file, and the integration suite runs against the same file. Deployments point
  Wrangler's `migrations_dir` at the installed package's `migrations/` directory.
- `migrations/auth/0001_auth.sql` is the issuer's own D1 schema (`auth_users`,
  `auth_tokens`, `auth_link_budget`, singleton `auth_sign_in_budget`, and
  `auth_schema_meta`). `auth_users.session_version` defaults to `0`; the issuer
  deployment points its `migrations_dir` at the installed package's
  `migrations/auth/` directory.
- The package has not shipped: shape changes still edit the single canonical files
  with debut catalog and auth stamps `1`. These files initialize fresh databases,
  not upgrade a previously released Archive schema. Never automatically delete,
  reset or replace an existing database.
- Collection filter/tag/title projections are persisted data, derived only on
  publication/update. Changing a payload schema, vocabulary or `index` does not
  rewrite existing rows; the active definition must match the stored dataset.
  Deliberately reset/reseed fresh unreleased development databases when semantics
  change. Reset is destructive and must be explicit, never automatic on startup
  or deployment. Do not introduce an upgrade/projection migration framework.
- `ARCHIVE_LIMITS` must stay in lockstep with the DDL CHECKs it mirrors (payload bytes,
  title chars, tags per entry, alias chars, report reason); `archiveLimitsSchema` and
  the health tests pin the pair, and the moderation-actions CHECK is pinned to
  `ARCHIVE_MODERATION_ACTIONS` by the migration test. The migration's
  `archive_schema_meta` stamp must equal `ARCHIVE_SCHEMA_VERSION`; the health read and
  the migration drift test pin that pair.

## Moderation accountability

- Every effective moderation action (hide, unhide, remove, erase-publisher) appends
  one `moderation_actions` row **in the same D1 batch as the action** — transactional,
  never a fire-and-forget insert. Idempotent no-ops record nothing; conditional
  audit SQL tests effective state in the batch, not only an earlier pre-read.
- The audit rows have no foreign keys and carry no names or content by design: the
  log must outlive the erasures it records and stay meaningful after renames. Do not
  "fix" either property.

## Content validation

- Collection vocabularies are optional readonly arrays, copied and frozen at
  registration; omitted means empty, not unrestricted. Definition faults throw
  `ArchiveDefinitionError`. Const generics infer version/vocabulary literals;
  `NoInfer` keeps `index` from widening vocabulary unions; omitted vocabularies
  infer `never`. No Set/adapter compatibility paths.
- The collection's `derive` step is the only content validator: stable JSON-object payload schema,
  canonicalize re-validation, vocabulary membership, title bounds, tag dedup/bound,
  sorted-key serialization, transformation stability, idempotent canonicalization,
  non-mutating indexing and the canonical byte ceiling. Invalid submitted JSON,
  schema failures, title/tag-count bounds and canonical size return `null` → 422.
  Callback exceptions, lossy/non-JSON schema outputs, unstable schema transforms, invalid/non-idempotent
  canonicalization, index mutation/out-of-vocabulary projections and hashing or
  response-schema faults throw `ArchiveDerivationError` → sanitized 500. Its
  `stage` is `schema | canonicalize | index | hash | response`; causes stay local.
  Route handlers never re-check content — do not add parallel validation layers.
- The content hash envelope (`{contentVersion, payload}`) is core-owned: a change
  there deliberately re-identifies every stored entry. Collections never hash.
- No content-migration helpers, historical-schema registries, compatibility
  aliases or deprecated APIs: the package has not been released.

## HTTP and identity boundaries

- Only anonymous entry lists may cache for `publicCacheSeconds`; any Cookie or
  Authorization header disables caching. Details always use `no-store`; metadata,
  private responses and errors do too.
- `/me/likes` (without `ids`), `/me/reports`, operator reports and moderation log
  use forward keyset pages bounded by `maxPageSize`, never total export caps.
  Subset likes (`?ids`) retain `{ ids }`. Reports have unique IDs, `resolvedAt`,
  queue status `unresolved | resolved` and the explicit report-resolution route.
- Health bypasses rate limits and sessions; schema mismatch and database failure
  answer HTTP 503 health DTOs with a reason, not a false 200 or raw error.
- The catalog requires `AUTH_ISSUER_SERVICE`: verify the RS256 JWT locally, then
  check the issuer's current account `session_version` on every private request.
  Cache no successful verdict. Preserve a validated 401 `unauthenticated`; map
  issuer service faults or unexpected responses to 503 `auth-unavailable`. Both
  service directions use a fixed 5000 ms timeout including body decoding; it does
  not cancel work already running.
- `GET /auth/health` is public and read-only: validate configuration, key
  signing/verification, binding shapes, `auth_schema_meta` against
  `AUTH_SCHEMA_VERSION` and expected tables/columns/triggers; never write, send
  email or probe the catalog. Return typed `AuthHealth`, 200 `ok` or 503 `degraded`.
- `POST /sign-out` is catalog-local cookie clearing and never contacts the issuer.
  `POST /auth/sign-out-all` belongs to the issuer: require a current-version session,
  marker, exact origin and captured `ACCOUNT_HEADER`; atomically advance
  `session_version`, delete outstanding links, then clear the cookie only on
  success. A changed account returns 409 and leaves both account data and cookie.
- Like and unlike both guard visible-entry existence in SQL and in the response
  read; a concurrent hide/delete must not leak a successful unavailable-entry DTO.
- `DELETE /me` erases only the Archive profile and never clears the cookie.
  `DELETE /auth/account` requires `AUTH_ARCHIVE`, calls `DELETE /me/account` and
  accepts exact 204 only, then
  the issuer user, then clears the cookie. Failures preserve the session for retry.
  Account export returns metadata only, never tokens or send-budget state.
- Full erasure atomically tombstones issuer/subject for 30 days plus ten seconds
  and deletes the profile. Ordinary authentication and registration SQL reject
  revoked subjects; only the dedicated erasure seam may bypass the issuer lookup
  to retry with the same principal's signed session while its existing tombstone is
  valid, still verifying signature and claims. Initial erasure and the outer issuer
  route validate the current version; a completed erasure retry there is 401.
  The sweep expires tombstones. Profile-only deletion permits re-registration;
  full re-enrollment needs a fresh issuer subject.
- Issuer email send allowances are durable and atomic: consuming/expiring links
  or failed delivery never refunds sends. Singleton durable `auth_sign_in_budget`
  bounds global admission before account creation/delivery (20 requests per 60
  seconds), independent of platform limiter bindings.
  Request emails trim/lowercase; sender configuration must be canonical, and
  operator-email list entries trim/lowercase before validation.
  Operator sessions last 900 seconds.
  Retired public verification keys support rotation; private JWKS members reject.
  Deployment-specific sign-in wrappers do not belong to the package.
- A central deployment can own a shared backend for multiple frontends. It registers
  collection definitions from browser-safe domain modules, not frontend application modules.
  Same-site HTTPS subdomains call its one API with included credentials and
  exact credentialed CORS; the session cookie stays host-only on the API host.
  Do not add parent-domain cookies or per-application issuers for shared browser login.
  Account erasure covers every registered collection; offline application data is not
  stored or erased by Archive.
- Magic-link GET is confirmation only, never consumes tokens or mutates sessions.
  Redemption requires POST JSON `{ token }`, marker, exact allowed/public origin.
  Trigger-backed token redemption and account stamping are atomic. Successful
  POST returns 204 Set-Cookie, not a redirect; confirmation owns navigation.
- Sign-in requests create pending accounts with no sign-in stamp; verified
  redemption stamps them. Sweep deletes expired tokens and closed per-user send
  windows before deleting unverified accounts with neither reference. Verified
  accounts are retained until erasure; the singleton admission row is retained.

## Observability

- The catalog sweep removes expired retry keys and revocation tombstones;
  successful events count both in `removed`.
- The catalog core never logs: runtime observation is `worker.tap(handler,
  { signal? })` emitting `ArchiveEvent`; a pre-aborted signal is inert. Typed
  diagnostics are sanitized; cache failures are observed, and scheduled failures
  emit failed events then rethrow. Deployments own the sink. The issuer also
  exposes `tap()` with public `AuthEvent` and
  `AuthDiagnostic`; it never logs directly. Diagnostics contain category only,
  never email, tokens, raw exceptions or offending input. Observer failure never
  affects behavior; scheduled failures emit then rethrow.

## Verification

- Unit (fast, hermetic): `pnpm vitest run packages/archive/src/__tests__/`
- Types: `pnpm --filter @vielzeug/archive test:types`
- Integration (real workerd + local D1): `pnpm --filter @vielzeug/archive
  test:integration` — fixtures generate Wrangler configs into isolated run dirs;
  never start a second suite run until the previous one has fully exited.
- Exercise the canonical catalog/auth DDL directly; issuer production workerd
  coverage must run the package factory, not only a signing fixture.
- Lint/build: `pnpm --filter @vielzeug/archive lint` / `build`
- Deployment-adapter consumers: run the deployment's catalog and issuer smoke tests.

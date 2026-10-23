---
title: 'Archive Examples: Stand Up a Content Archive'
description: 'Deploy the catalog and passwordless issuer Workers with fresh D1 databases, reciprocal service bindings, and session smoke tests.'
---

## Stand Up a Content Archive

### Problem

You need a production-shaped Archive deployment with separate catalog and issuer
databases, while both Workers share one browser-facing API origin and validate the
same session authority.

### Solution

Install Archive and Spell in the deployment project. The collection module is safe
to import from both browser and Worker code; keep the Worker factories in their
server-only entry files.

```ts
// src/collections.ts
import { defineArchiveCollection } from '@vielzeug/archive';
import { s } from '@vielzeug/spell';

export const notes = defineArchiveCollection({
  name: 'notes',
  contentVersion: 1,
  payloadSchema: s.object({
    title: s.string().trim().min(1).max(128),
    body: s.string().trim().max(4000),
  }),
  index: ({ title }) => ({ title, filter: null, tags: [] }),
});
```

The catalog entry imports that browser-safe definition and attaches a sanitized
observer without adding logging to the library.

```ts
// src/catalog.ts
import { createArchiveWorker } from '@vielzeug/archive/worker';
import { notes } from './collections';

const catalog = createArchiveWorker([notes]);
catalog.tap((event) => console.log(JSON.stringify(event)));
export default catalog;
```

The issuer is a separate Worker with its own D1 database and scheduled sweep.

```ts
// src/issuer.ts
import { createAuthWorker } from '@vielzeug/archive/auth';

const issuer = createAuthWorker();
issuer.tap((event) => console.log(JSON.stringify(event)));
export default issuer;
```

The two Wrangler configs below use one API hostname. Cloudflare sends the more
specific `/api/v1/auth/*` route to the issuer and the remaining `/api/v1/*` routes
to the catalog. The matching service bindings let each Worker call the other
without exposing an extra public endpoint.

```jsonc
// wrangler.catalog.jsonc
{
  "name": "archive-catalog",
  "main": "src/catalog.ts",
  "compatibility_date": "2026-10-12",
  "routes": [{ "pattern": "api.example.com/api/v1/*", "zone_name": "example.com" }],
  "vars": {
    "APP_ENV": "production",
    "ALLOWED_ORIGINS": "https://app.example.com",
    "JWT_ISSUER": "https://api.example.com",
    "JWT_AUDIENCE": "community-archive",
    "JWT_JWKS_URL": "https://api.example.com/api/v1/auth/jwks.json",
    "LIKES_ENABLED": "true",
    "PUBLISHING_ENABLED": "true",
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "archive-catalog",
      "database_id": "replace-with-catalog-d1-id",
      "migrations_dir": "./node_modules/@vielzeug/archive/migrations",
    },
  ],
  "ratelimits": [
    { "name": "READ_LIMIT", "namespace_id": "1001", "simple": { "limit": 120, "period": 60 } },
    { "name": "WRITE_LIMIT", "namespace_id": "1002", "simple": { "limit": 30, "period": 60 } },
  ],
  "services": [{ "binding": "AUTH_ISSUER_SERVICE", "service": "archive-issuer" }],
  "triggers": { "crons": ["17 4 * * *"] },
}
```

Set the issuer's narrower public route and reciprocal service binding. Use a
separate D1 database and the auth migration directory inside the installed package.

```jsonc
// wrangler.issuer.jsonc
{
  "name": "archive-issuer",
  "main": "src/issuer.ts",
  "compatibility_date": "2026-10-12",
  "routes": [{ "pattern": "api.example.com/api/v1/auth/*", "zone_name": "example.com" }],
  "vars": {
    "APP_ENV": "production",
    "ALLOWED_ORIGINS": "https://app.example.com",
    "APP_NAME": "Archive",
    "AUTH_ISSUER": "https://api.example.com",
    "AUDIENCE": "community-archive",
    "OPERATOR_EMAILS": "operators@example.com",
    "PUBLIC_ORIGIN": "https://api.example.com",
    "SENDER_ADDRESS": "archive@example.com",
  },
  "d1_databases": [
    {
      "binding": "AUTH_DB",
      "database_name": "archive-issuer",
      "database_id": "replace-with-issuer-d1-id",
      "migrations_dir": "./node_modules/@vielzeug/archive/migrations/auth",
    },
  ],
  "send_email": [{ "name": "AUTH_EMAIL" }],
  "services": [{ "binding": "AUTH_ARCHIVE", "service": "archive-catalog" }],
  "triggers": { "crons": ["23 * * * *"] },
}
```

Install the runtime packages and Wrangler, then confirm that the installed package
ships both fresh-schema DDL files at the paths the configs reference:

```sh
pnpm add @vielzeug/archive @vielzeug/spell
pnpm add -D wrangler
ls node_modules/@vielzeug/archive/migrations/0001_community_archive.sql \
  node_modules/@vielzeug/archive/migrations/auth/0001_auth.sql
```

Create both D1 databases and copy each printed `database_id` into its config in
place of the `replace-with-…` value. Replace the example host, sender and operator
addresses with your deployment values, then apply each fresh schema:

```sh
pnpm exec wrangler d1 create archive-catalog
pnpm exec wrangler d1 create archive-issuer
pnpm exec wrangler d1 migrations apply archive-catalog --remote --config wrangler.catalog.jsonc
pnpm exec wrangler d1 migrations apply archive-issuer --remote --config wrangler.issuer.jsonc
```

Generate the secrets straight into Wrangler so they never touch a file or `vars`.
The pepper is 64 random hex characters; the signing key is a fresh 2048-bit RS256
private JWK exported by Node's Web Crypto API:

On a fresh account, Wrangler 4's `secret put` creates an empty Worker under the
configured name before adding its secret. Accept the creation prompt for **both**
Workers (non-interactive runs default to creation). Finish both secret commands
before deploying either runtime: this ensures both service-binding targets exist.
Do not route frontend traffic until both runtime deploys and readiness checks pass.

```sh
node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))' |
  pnpm exec wrangler secret put RATE_LIMIT_KEY_SECRET --config wrangler.catalog.jsonc
node --input-type=module -e '
const { privateKey } = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true,
  ["sign", "verify"],
);
process.stdout.write(JSON.stringify(await crypto.subtle.exportKey("jwk", privateKey)));
' | pnpm exec wrangler secret put AUTH_JWT_PRIVATE_JWK --config wrangler.issuer.jsonc
pnpm exec wrangler deploy --config wrangler.issuer.jsonc
pnpm exec wrangler deploy --config wrangler.catalog.jsonc
```

Use separate, deployment-specific random values for the rate-limit pepper and the
active 2048-bit RS256 private JWK. The production pepper must contain at least 32
characters. A deployment secret manager may supply the same values; never put them
in `vars`, source, or logs.
Configure the issuer's email sending binding and verify its sender domain before
production sign-in. `AUTH_JWT_PREVIOUS_PUBLIC_JWKS` is optional and accepts only
retired public keys during rotation. Keep `AUTH_ISSUER` and `JWT_ISSUER` identical,
and keep `AUDIENCE` and `JWT_AUDIENCE` identical. Set `JWT_JWKS_URL` to the
issuer's `/api/v1/auth/jwks.json` URL. The catalog fetches that URL through
`AUTH_ISSUER_SERVICE`, not global `fetch`; bind it to the issuer Worker even when
both Workers share a Cloudflare zone and API hostname. The issuer also exposes
the JWKS route publicly. Set `ALLOWED_ORIGINS` in both Workers to the exact
frontend origins; never use a wildcard. Same-site subdomain frontends must send
credentials, and the cookie remains host-only on the API hostname. Serve
`/signed-in` from the API origin as the issuer's post-confirmation handoff page.
Serve the sign-in entry at `${PUBLIC_ORIGIN}/account`: confirmation and noscript
recovery link directly there as “Request a new sign-in link”. These recovery and
completion routes are fixed reference issuer conventions owned by your application.
The initial “Back to app” exit still links to `${PUBLIC_ORIGIN}/`.
The issuer needs no platform rate-limit bindings for sign-in admission: its D1
admission budget allows 20 requests per 60 seconds and its durable per-email
budget allows three messages per hour. Those budgets do not cover
`POST /auth/verify` or `GET /auth/session`; add a Cloudflare rate-limit rule (or
an equivalent edge control) for both paths on the issuer route in production.

Both DDL files initialize fresh databases only. Do not point them at an existing
database and expect an automatic upgrade, reset or data deletion. The catalog
health route checks `archive_schema_meta`; issuer health checks `auth_schema_meta`
against `AUTH_SCHEMA_VERSION`. The issuer sweep runs hourly in this sample and the
catalog sweep daily; choose schedules that fit your retention and operational
requirements.

Check readiness with the installed package's own schemas. Both Workers must parse
as their health DTO and report HTTP 200 with `status: 'ok'`; a 503 body names the
sanitized `reason`.

```js
// check-health.mjs
import { archiveAuthHealthSchema, archiveHealthSchema } from '@vielzeug/archive';

const api = process.env.API_ORIGIN;
for (const [path, schema] of [
  ['/api/v1/health', archiveHealthSchema],
  ['/api/v1/auth/health', archiveAuthHealthSchema],
]) {
  const response = await fetch(`${api}${path}`);
  const health = schema.parse(await response.json());
  if (response.status !== 200 || health.status !== 'ok') {
    throw new Error(`${path}: HTTP ${response.status}, reason ${health.reason}`);
  }
  console.log(path, health.status, `db schema ${health.dbSchemaVersion}`);
}
```

Sign in the **same test account** in two separate clients through the magic-link
flow and save their cookies in `first-device.cookies` and `second-device.cookies`.
Use a **different disposable test account** for `erasure.cookies`: the script
permanently deletes that account. This script verifies readiness, local sign-out,
issuer-wide revocation, and coordinated deletion. Keep these cookie files private
and remove them after testing.

```sh
set -eu
API_ORIGIN=https://api.example.com
APP_ORIGIN=https://app.example.com

API_ORIGIN="$API_ORIGIN" node check-health.mjs

# Register the profiles the checks below read.
for JAR in first-device.cookies erasure.cookies; do
  curl --fail-with-body -X POST "$API_ORIGIN/api/v1/me" \
    -H "Origin: $APP_ORIGIN" -H "x-archive-request: 1" \
    -H "Content-Type: application/json" -d '{}' -b "$JAR"
done

# Local sign-out clears one cookie; its copied session is still valid.
cp first-device.cookies copied-session.cookies
curl --fail-with-body -X POST "$API_ORIGIN/api/v1/sign-out" \
  -H "Origin: $APP_ORIGIN" -H "x-archive-request: 1" \
  -b first-device.cookies -c first-device.cookies
curl --fail-with-body "$API_ORIGIN/api/v1/me" -b copied-session.cookies

ISSUER_ACCOUNT_ID=$(
  curl --fail-with-body "$API_ORIGIN/api/v1/auth/account" -b second-device.cookies |
    node -e 'let data=""; process.stdin.on("data", (part) => data += part); process.stdin.on("end", () => console.log(JSON.parse(data).id));'
)
SIGN_OUT_ALL=$(curl --silent --show-error -w '\n%{http_code}' \
  -X POST "$API_ORIGIN/api/v1/auth/sign-out-all" \
  -H "Origin: $APP_ORIGIN" -H "x-archive-request: 1" \
  -H "X-Archive-Account: $ISSUER_ACCOUNT_ID" \
  -b second-device.cookies -c second-device.cookies)
test "$(printf '%s' "$SIGN_OUT_ALL" | tail -n 1)" = 200
test "$(printf '%s' "$SIGN_OUT_ALL" | head -n 1)" = '{"ok":true}'
STATUS=$(curl --silent --show-error -o /dev/null -w '%{http_code}' \
  "$API_ORIGIN/api/v1/me" -b copied-session.cookies)
test "$STATUS" = 401

ERASURE_ACCOUNT_ID=$(
  curl --fail-with-body "$API_ORIGIN/api/v1/auth/account" -b erasure.cookies |
    node -e 'let data=""; process.stdin.on("data", (part) => data += part); process.stdin.on("end", () => console.log(JSON.parse(data).id));'
)
PUBLISHER_ID=$(
  curl --fail-with-body "$API_ORIGIN/api/v1/me" -b erasure.cookies |
    node -e 'let data=""; process.stdin.on("data", (part) => data += part); process.stdin.on("end", () => console.log(JSON.parse(data).id));'
)
curl --fail-with-body -X DELETE "$API_ORIGIN/api/v1/auth/account" \
  -H "Origin: $APP_ORIGIN" -H "x-archive-request: 1" \
  -H "X-Archive-Account: $ERASURE_ACCOUNT_ID" \
  -H "x-archive-publisher: $PUBLISHER_ID" \
  -b erasure.cookies -c erasure.cookies
```

A changed current account must return 409 `account-changed` and retain the cookie.
The erasure call must return 204 and expire the cookie. The issuer calls catalog
`DELETE /api/v1/me/account` through `AUTH_ARCHIVE`, accepts only exact 204, then
deletes its own account. A failure preserves the session so the same captured
account UUID can retry. Ordinary private requests validate the JWT locally and
query the issuer's current session version through `AUTH_ISSUER_SERVICE`; issuer
failure is 503 `auth-unavailable`, not a signed-out 401. There is no cached
verdict or guarantee that an already-running request is cancelled by sign-out-all.

### Pitfalls

- Hand-writing the entry envelope instead of using `collection.contract`: the
  composed schemas pin both versions; declare every vocabulary value your
  `index` derives or the collection throws `ArchiveDerivationError`, mapped to a
  sanitized 500 `internal` response.
- Treating `GET /api/v1/auth/health` as a peer probe: it checks issuer readiness
  only and does not send email or call the catalog.
- Clearing the cookie with `/api/v1/sign-out` when the requirement is to revoke all
  sessions: use the issuer's guarded `/api/v1/auth/sign-out-all` route instead.
- Treating the package DDL as an upgrade: the installed migration files initialize
  fresh D1 databases and never automatically reset existing data.

### Related

- [Archive Usage Guide](../usage.md) — the environment table and the route surface.
- [Content Identity and Versions](./content-identity-and-versions.md) — the hash envelope in depth.
- [Multi-Collection Deployment](./multi-collection-deployment.md) — serving several collections.
- [GDPR Erasure and Export](./gdpr-erasure-and-export.md) — coordinated profile and issuer deletion.

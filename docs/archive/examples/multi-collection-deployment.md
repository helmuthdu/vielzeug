---
title: 'Archive Examples: Multi-Collection Deployment'
description: "Register independent JSON collections with shared publishers and isolated content contracts."
---

## Multi-Collection Deployment

### Problem

One deployment stores notes and recipes with different payload schemas. Users
share one publisher identity, but payload validation, retry keys and publication
quotas must remain collection-scoped.

### Solution

Define each collection and register both in the same Worker.

```ts
import { defineArchiveCollection } from '@vielzeug/archive';
import { createArchiveWorker } from '@vielzeug/archive/worker';
import { s } from '@vielzeug/spell';

const notes = defineArchiveCollection({
  name: 'notes', contentVersion: 1,
  payloadSchema: s.object({ title: s.string().min(1).max(128) }),
  index: ({ title }) => ({ title, filter: null, tags: [] }),
});
const recipes = defineArchiveCollection({
  name: 'recipes', contentVersion: 1,
  payloadSchema: s.object({
    name: s.string().min(1).max(32),
    cuisine: s.enum(['italian', 'japanese']),
  }),
  filters: ['italian', 'japanese'],
  index: ({ cuisine, name }) => ({ title: name, filter: cuisine, tags: [] }),
});
export default createArchiveWorker([notes, recipes]);
```

`GET /me/publications?collection=notes` uses `notes.contract.ownedEntries`; use the
recipe contract for recipe responses. `/me/likes` and `/me/reports` span the user
across collections and use forward pages, not a single bounded export.

#### Choosing a topology

Share a Worker when the collections share publishers and operators. Prefer
independent deployments when moderation teams or service ownership differ:
operator authority is deployment-global, not collection-scoped.

#### Sharing sign-in across game subdomains

Serve the issuer and catalog through one HTTPS API origin. For example, an
account hub owns `https://example.com/api/v1`, while a game runs at
`https://game.example.com`. Both frontends call that API; they do not run
independent issuers.

Route `/api/v1/auth/*` to the issuer and the other `/api/v1/*` routes to the
catalog. Bind `AUTH_ISSUER_SERVICE` from catalog to issuer for signing-key retrieval
and current session-version checks, and `AUTH_ARCHIVE` from issuer to catalog for coordinated
account erasure. The issuer's `GET /api/v1/auth/session` binding contract is not a
frontend route. The catalog first verifies the RS256 JWT locally, then checks the
current issuer verdict without caching it; an unavailable or invalid verdict is
503 `auth-unavailable`.

Keep the issuer's cookie host-only on the API host. Its `HttpOnly`,
`SameSite=Strict`, `/api/v1` path and production `Secure` attributes remain
unchanged. HTTPS subdomains of the same registrable domain are same-site, but
different origins: authenticated calls need `credentials: 'include'` and both
Workers need exact allowed origins with credentialed CORS. The issuer's
`AUTH_ISSUER` must equal the catalog's `JWT_ISSUER`; `AUDIENCE` and
`JWT_AUDIENCE` must also match. Point `JWT_JWKS_URL` at the issuer's public
`/api/v1/auth/jwks.json` route.
The catalog requests that URL through the issuer service binding rather than
global `fetch`, including when both Workers share a Cloudflare zone. Cached
signing keys never replace the uncached session-version check.

Forward the request marker on mutations and the captured publisher precondition
on publisher-scoped operations.
For full account deletion, also send `ACCOUNT_HEADER` (`X-Archive-Account`) with
the issuer account UUID displayed for confirmation. Keep that UUID on retries;
the issuer rejects a changed shared login before deleting any data.

```ts
import { archiveIdentitySchema } from '@vielzeug/archive';

const apiUrl = 'https://example.com/api/v1';
const response = await fetch(`${apiUrl}/me`, { credentials: 'include' });
if (!response.ok) throw new Error(`Identity unavailable (${response.status})`);
const publisher = archiveIdentitySchema.parse(await response.json());
console.log(publisher);
```

The issuer's `PUBLIC_ORIGIN` is the central host: links open its confirmation
page and success navigates to its `/signed-in` page. That page can link to the
game without accepting an arbitrary redirect URL. Use `GET /auth/account` for
issuer account metadata; a signed-in account need not have registered an Archive
publisher yet.

Revalidate when another application's tab becomes visible. Cookies are shared
through the API, not frontend state or browser storage. Sign-out clears that
browser's API cookie through `POST /api/v1/sign-out`; it does not call the issuer
or revoke copied tokens or sign out other devices. To revoke every session, call
the issuer's guarded `POST /api/v1/auth/sign-out-all` with the captured issuer
account UUID in `ACCOUNT_HEADER`. It atomically advances `session_version` and
deletes outstanding links. A 409 `account-changed` means another account replaced
the session; keep the captured UUID through retries.
Account erasure removes the shared publisher's data across every collection.
Local game saves remain outside that operation.

Do not add a parent-domain cookie or a wildcard origin allowlist. A frontend on an
unrelated domain is cross-site and cannot assume this `SameSite=Strict` flow.
Test the deployment with same-site HTTPS hosts, not only a localhost proxy.

### Pitfalls

- Registering duplicate names: the factory throws `ArchiveDefinitionError` at startup;
  retry keys and publication quotas remain collection/owner-scoped.
- Omitting `collection` from `/me/publications` returns 400; parse responses with
  that collection's contract, not another payload schema.
- Treating a cross-origin subdomain as same-origin: private requests must include
  credentials, and the issuer binding must handle both JWKS and session requests.
- Assuming shared sign-in synchronizes offline game data or updates other tabs
  immediately: revalidate the session when a tab becomes visible.

### Related

- [Stand Up a Content Archive](./stand-up-a-content-archive.md)
- [Archive API Reference](../api.md)
- [GDPR Erasure and Export](./gdpr-erasure-and-export.md)

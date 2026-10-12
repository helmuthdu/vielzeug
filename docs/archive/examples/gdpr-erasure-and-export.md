---
title: 'Archive Examples: GDPR Erasure and Export'
description: "Export profile, publications, liked IDs, reports and issuer metadata, then coordinate account erasure."
---

## GDPR Erasure and Export

### Problem

A signed-in user requests their stored data and then account deletion. Catalog
profile data and issuer metadata live in separate databases; deleting only `/me`
does not delete the issuer account or sign the browser out.

### Solution

Export each configured collection and drain the forward likes/reports pages, then
make one issuer deletion request with the captured issuer account UUID and
publisher precondition. The issuer account ID and publisher ID are different.

```ts
import {
  archiveAccountSchema, archiveIdentitySchema, archiveLikesPageSchema, archiveOwnReportsSchema,
  ACCOUNT_HEADER, defineArchiveCollection, PUBLISHER_HEADER, REQUEST_MARKER_HEADER,
} from '@vielzeug/archive';
import { s } from '@vielzeug/spell';

const notes = defineArchiveCollection({
  name: 'notes', contentVersion: 1,
  payloadSchema: s.object({ title: s.string().min(1).max(128) }),
  index: ({ title }) => ({ title, filter: null, tags: [] }),
});
async function read(path: string, publisherId?: string): Promise<unknown> {
  const response = await fetch(`/api/v1${path}`, {
    credentials: 'same-origin',
    headers: publisherId ? { [PUBLISHER_HEADER]: publisherId } : {},
  });
  if (!response.ok) throw new Error(`Export failed (${response.status})`);
  return response.json();
}

const identity = archiveIdentitySchema.parse(await read('/me'));
if (identity === null) throw new Error('Register a publisher before this export');
const publications = notes.contract.ownedEntries.parse(
  await read('/me/publications?collection=notes', identity.id),
);
const likes: string[] = [];
let cursor: string | null = null;
do {
  const params = new URLSearchParams({ limit: '50' });
  if (cursor !== null) params.set('cursor', cursor);
  const page = archiveLikesPageSchema.parse(await read(`/me/likes?${params}`, identity.id));
  likes.push(...page.ids);
  cursor = page.cursor;
} while (cursor !== null);

const reports: ReturnType<typeof archiveOwnReportsSchema.parse>['reports'] = [];
do {
  const params = new URLSearchParams({ limit: '50' });
  if (cursor !== null) params.set('cursor', cursor);
  const page = archiveOwnReportsSchema.parse(await read(`/me/reports?${params}`, identity.id));
  reports.push(...page.reports);
  cursor = page.cursor;
} while (cursor !== null);
const account = archiveAccountSchema.parse(await read('/auth/account'));
console.log({ account, identity, publications, likes, reports });

const erased = await fetch('/api/v1/auth/account', {
  credentials: 'same-origin', method: 'DELETE',
  headers: {
    [ACCOUNT_HEADER]: account.id,
    [PUBLISHER_HEADER]: identity.id,
    [REQUEST_MARKER_HEADER]: '1',
  },
});
if (!erased.ok) throw new Error(`Erasure failed (${erased.status}); retry before local cleanup`);
```

The issuer first compares `ACCOUNT_HEADER` with the verified session subject.
Missing or invalid account UUIDs return 400; a changed account returns 409
`account-changed` without touching either database. Capture the account UUID
before asking for confirmation and keep it across retries, even for accounts
that have not registered a publisher.

The issuer requires the JWT's `sessionVersion` to match the current
`auth_users.session_version` for ordinary authenticated routes. The catalog also
checks the issuer's current session verdict after local JWT verification; an
issuer outage is 503 `auth-unavailable`, not an anonymous response. The dedicated
catalog `DELETE /me/account` route may bypass the issuer lookup only to retry with
the original signed session while its matching revocation tombstone is valid. The
issuer's outer `DELETE /auth/account` route checks the current session version
before beginning erasure.

The issuer requires `AUTH_ARCHIVE`, a service binding to the catalog Worker. It
first calls `DELETE /me/account` with the caller's session and guards, requires an
exact 204 response, then
deletes the issuer user, then expires the cookie. Each half is idempotent; a failure
retains the session for retry, but partial profile deletion may already have
completed. The catalog atomically writes an issuer/subject revocation tombstone
and deletes the profile. Ordinary private routes and registration reject the old
subject; the dedicated erasure seam still accepts its otherwise valid session to
finish a retry. After success your application signs out and clears local tracking.

`POST /api/v1/sign-out` is different from erasure: it only clears the current
browser cookie and does not revoke other sessions. Use the issuer's guarded
`POST /api/v1/auth/sign-out-all` when the user asks to revoke every session. That
route requires the account UUID captured before confirmation, atomically increments
the session version and deletes outstanding links; it is not part of account
erasure and does not promise to cancel in-flight work.

#### With profile-only removal

Call `DELETE /api/v1/me` only when you intend to remove publications, likes,
reports and retry keys while keeping the issuer account and session. The response
does not clear the cookie. Export all registered collections, not only the `notes`
collection shown above; account metadata contains no tokens or send-budget data.
Profile-only deletion permits re-registration with the same credentials. Full
erasure blocks the old subject for 30 days plus ten seconds; the reference issuer
creates a new account UUID on re-enrollment, while external issuers must use a new
subject during that window.

### Pitfalls

- Treating the first likes page as the complete export: `maxPageSize` is per page.
- Clearing local identity before failed erasure can be retried with the same guards.
- Recapturing the account ID on retry: another tab may have signed in to a different account.
- Expecting erasure to retract copies users already saved outside the service.
- Assuming audit rows disappear: opaque moderation records intentionally survive.

### Related

- [Archive Usage Guide](../usage.md)
- [Client Error Mapping](./client-error-mapping.md)
- [Multi-Collection Deployment](./multi-collection-deployment.md)

---
title: 'Archive Examples: Moderate Content'
description: "Page report queues, resolve report IDs, hide content and inspect atomic moderation audit records."
---

## Moderate Content

### Problem

An operator must review reader reports, remove an entry from public view without
destroying it, and resolve the report independently of the entry's visibility.
The service must audit effective moderation actions, not retries.

### Solution

Use an issuer session whose verified role claim grants operator authority and a
registered publisher identity; page unresolved reports before acting.

```ts
import {
  archiveIdentitySchema, archiveModerationLogSchema, archiveReportsSchema,
  PUBLISHER_HEADER, REQUEST_MARKER_HEADER,
} from '@vielzeug/archive';

const identityResponse = await fetch('/api/v1/me', { credentials: 'same-origin' });
if (!identityResponse.ok) throw new Error('Sign in first');
const identity = archiveIdentitySchema.parse(await identityResponse.json());
if (!identity?.operator) throw new Error('A registered operator is required');
const headers = { [PUBLISHER_HEADER]: identity.id, [REQUEST_MARKER_HEADER]: '1' };
async function call(path: string, method = 'GET'): Promise<Response> {
  const response = await fetch(`/api/v1${path}`, {
    credentials: 'same-origin', headers, method,
  });
  if (!response.ok) throw new Error(`Moderation failed (${response.status})`);
  return response;
}

const reports: ReturnType<typeof archiveReportsSchema.parse>['reports'] = [];
let cursor: string | null = null;
do {
  const params = new URLSearchParams({ status: 'unresolved', limit: '50' });
  if (cursor !== null) params.set('cursor', cursor);
  const page = archiveReportsSchema.parse(await (await call(`/collections/notes/reports?${params}`)).json());
  reports.push(...page.reports);
  cursor = page.cursor;
} while (cursor !== null);

const report = reports[0];
if (report !== undefined) {
  await call(`/collections/notes/entries/${report.entryId}/hidden`, 'PUT');
  await call(`/collections/notes/reports/${report.id}/resolved`, 'PUT');
}
const page = archiveModerationLogSchema.parse(
  await (await call('/moderation-log?limit=50')).json(),
);
console.log(page.actions, page.cursor);
```

Hidden entries disappear from public lists, detail and likes. Owners still see
`hidden: true` in their publications; edits and create-key replay freeze, but owner
removal remains allowed. `DELETE /entries/:id/hidden` restores visibility.
Like and unlike both require visibility at the guarded write and response read;
a racing hide or deletion produces 404 rather than an unavailable-entry like DTO.

Reports have unique IDs and nullable `resolvedAt`. Queue `status` defaults to
`unresolved`; use `resolved` to inspect completed reports. Resolving the same report
again is a 204 no-op and does not introduce a new audit action kind.

#### With accountability

Effective hide, unhide, operator removal and publisher erasure append exactly one
audit row in the same D1 batch as the action. Conditional SQL checks the effective
state, so concurrent idempotent retries create no duplicate audit rows. Rows
contain IDs, action, collection and timestamp only; no names, payloads or foreign
keys. Follow the moderation log's cursor to inspect more than one page.

### Pitfalls

- Sending an entry ID to `/reports/:id/resolved`: use the report's unique `id`.
- Reusing a cursor after changing status or collection: cursors bind query context.
- Reporting hidden or missing entries: these answer 404.
- Using `/publishers/:id` to delete issuer accounts: it erases Archive profiles only.

### Related

- [Archive API Reference](../api.md)
- [Archive Usage Guide](../usage.md)
- [GDPR Erasure and Export](./gdpr-erasure-and-export.md)

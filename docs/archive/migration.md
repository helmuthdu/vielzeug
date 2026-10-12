---
title: Archive Migration
description: "Breaking contract changes after the first published release (26.10.6): forward-only entry pages and a slimmer derivation surface."
---

# Archive 26.10 Migration

Archive first shipped as 26.10.6. The next train simplifies the public contract
in three breaking ways. There are no compatibility layers: the removed surfaces
are gone. The SQL migrations under `migrations/` still initialize fresh D1
databases unchanged — none of these changes touch stored data.

## Entry pages page forward only

`ArchivePage` is now `{ cursor, entries }`; the `previous` cursor is removed and
entry cursors encode the forward position only. Walk a list in one direction:
follow `cursor` until it is `null`, preserving the query context that minted it.

```ts
// Before: first page carried a backward cursor
const page = contract.page.parse(await response.json());
if (page.previous) params.set('cursor', page.previous);

// After: one forward cursor, null at the end
const page = contract.page.parse(await response.json());
if (page.cursor) params.set('cursor', page.cursor);
```

Entry cursors are also minted against the full query context (collection, sort,
author, filter, tag, normalized search), so replaying a cursor under a different
query is a 400 `bad-request` instead of a silently mixed page. This matches the
cursor guard `/me/likes`, `/me/reports`, operator reports and the moderation log
already used.

## `ArchiveDerivationStage` no longer includes `'response'`

Stored payloads are canonical by construction, so emitted entries are validated
against the plain payload schema — the derivation no longer re-validates a
stabilized response shape. `ArchiveDerivationStage` is now
`'canonicalize' | 'hash' | 'index' | 'schema'`. If you matched on `'response'`,
remove that branch; no new stage replaces it.

## `/auth` no longer re-exports the session lifetime

`OPERATOR_SESSION_MAX_AGE_SECONDS` is no longer re-exported from
`@vielzeug/archive/auth`. Import it from the root contract instead:

```ts
// Before
import { OPERATOR_SESSION_MAX_AGE_SECONDS } from '@vielzeug/archive/auth';

// After
import { OPERATOR_SESSION_MAX_AGE_SECONDS } from '@vielzeug/archive';
```

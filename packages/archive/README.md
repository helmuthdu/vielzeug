# @vielzeug/archive

> Community content publishing for Cloudflare Workers + D1: a hardened Worker core over per-collection payload schemas

## Installation

```sh
pnpm add @vielzeug/archive @vielzeug/spell
npm install @vielzeug/archive @vielzeug/spell
yarn add @vielzeug/archive @vielzeug/spell
```

## Quick Start

Define your content as one payload schema plus what to index, and export the Worker
built from it:

```ts
import { defineArchiveCollection } from '@vielzeug/archive';
import { createArchiveWorker } from '@vielzeug/archive/worker';
import { s } from '@vielzeug/spell';

const payloadSchema = s.object({
  cuisine: s.enum(['italian', 'japanese']),
  ingredients: s.array(s.string().trim().min(1).max(64)).min(1).max(20),
  name: s.string().trim().min(1).max(32),
});

export const recipesCollection = defineArchiveCollection({
  // Ingredient order is not identity: sort it into one canonical form.
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

export default createArchiveWorker([recipesCollection]);
```

The collection's `contract` bundle then drives your client:
`recipesCollection.contract.entry`, `.page`, `.publishInput`, and `.updateInput`
are the same schemas the Worker uses. Payloads are stable JSON objects with
sorted-key serialization; vocabularies are optional readonly arrays. The root
entry is browser-safe. Deploy the sibling `@vielzeug/archive/auth` issuer with its
required `AUTH_ARCHIVE` binding for coordinated account deletion, and bind the
catalog's required `AUTH_ISSUER_SERVICE` to that issuer for an uncached
session-version check after local JWT verification.

Issuer sessions carry the required `sessionVersion` claim backed by
`auth_users.session_version`. `POST /api/v1/sign-out` only clears the current
cookie; `POST /api/v1/auth/sign-out-all` advances the version and revokes all
sessions. `GET /api/v1/auth/health` exposes the typed, read-only
`archiveAuthHealthSchema` readiness response. Issuer admission is durable D1
state: 20 requests per minute, plus three sends per email per hour; no issuer
rate-limiter binding is required. Magic-link GETs show a confirmation page; only
a deliberate guarded POST redeems the token.

Full account deletion revokes old issuer/subject sessions; profile-only deletion
does not. Re-enrollment uses a fresh issuer subject. Both Worker factories expose
typed `tap()` events and never log directly. Invalid content derives to `null`;
collection faults throw `ArchiveDerivationError`. Shipped DDL initializes fresh
databases only. Index projections are persisted data; changing a definition does
not update existing rows.

## Documentation

- [Overview](https://vielzeug.dev/archive/)
- [Usage Guide](https://vielzeug.dev/archive/usage)
- [API Reference](https://vielzeug.dev/archive/api)
- [Examples](https://vielzeug.dev/archive/examples)
- [Release Status](https://vielzeug.dev/archive/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu): part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.

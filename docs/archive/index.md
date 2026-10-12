---
title: Archive
description: "Community content publishing for Cloudflare Workers + D1: a hardened Worker core over per-collection payload schemas"
package: archive
category: utilities
keywords: [cloudflare, worker, d1, community, publishing, content, catalog, gdpr]
related: [spell, courier, rune]
exports: [defineArchiveCollection, createArchiveWorker, createAuthWorker, archiveAuthHealthSchema, ArchiveDerivationError]
environments: [browser, node]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="archive" />

## Why Archive?

You can share content entries with ranked browsing, filters, likes and account
erasure on Cloudflare Workers + D1. `defineArchiveCollection` supplies your JSON
payload schema and indexing rules; the Worker supplies sessions, guards,
idempotent publishing, cursors and rate limits.

```ts
// Before: each deployment repeats validation, indexing and route plumbing.

// After: the deployment is one collection definition plus one factory call.
import { defineArchiveCollection } from '@vielzeug/archive';
import { createArchiveWorker } from '@vielzeug/archive/worker';
import { s } from '@vielzeug/spell';

const notes = defineArchiveCollection({
  name: 'notes', contentVersion: 1,
  payloadSchema: s.object({ title: s.string().min(1).max(128) }),
  index: ({ title }) => ({ title, filter: null, tags: [] }),
});
export default createArchiveWorker([notes]);
```

| Feature                              | Archive                                                  | Hand-rolled Worker                  | BaaS (Firebase/Supabase)              |
| ------------------------------------ | -------------------------------------------------------- | ------------------------------------ | ------------------------------------- |
| Bundle size (core)                   | <PackageInfo package="archive" type="size" />        | Depends on deployment code | Depends on selected SDK |
| Zero dependencies | No — Spell and jose | Depends on implementation | No — client SDK |
| Content knowledge in the core        | <ore-icon name="check" size="16"></ore-icon> none — one collection seam | <ore-icon name="x" size="16"></ore-icon> baked in | <ore-icon name="x" size="16"></ore-icon> rules everywhere |
| Canonical fresh-database D1 schema   | <ore-icon name="check" size="16"></ore-icon> in the package      | Deployment-owned | Not a D1 backend |
| Idempotent publish w/ tombstones     | <ore-icon name="check" size="16"></ore-icon> built-in      | <ore-icon name="x" size="16"></ore-icon> rebuild it | <ore-icon name="x" size="16"></ore-icon> rebuild it |
| GDPR erasure / export endpoints      | <ore-icon name="check" size="16"></ore-icon> built-in      | <ore-icon name="x" size="16"></ore-icon> rebuild it | <ore-icon name="triangle-alert" size="16"></ore-icon> partial |
| Strict DTO re-validation on read     | <ore-icon name="check" size="16"></ore-icon> every entry   | <ore-icon name="x" size="16"></ore-icon> optional | <ore-icon name="x" size="16"></ore-icon> optional |

<div class="decision-callout">

**Use Archive when** an app needs a shareable, ranked, liked community space for
content entries on Cloudflare Workers + D1, and can express its content as one strict
payload schema.
**Consider alternatives when** you need rich queries beyond filter/tag/search, live
collaboration, or a backend you do not control — Archive is deliberately one narrow,
hardened surface.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/archive @vielzeug/spell
```

```sh [npm]
npm install @vielzeug/archive @vielzeug/spell
```

```sh [yarn]
yarn add @vielzeug/archive @vielzeug/spell
```

:::

## Quick Start

A deployment is one collection definition plus one factory call. The definition
brings the payload schema and what to index; everything else — the emitted-entry
envelope, the content hash, the wire contract, the routes — is composed for you.

```ts
import { defineArchiveCollection } from '@vielzeug/archive';
import { createArchiveWorker } from '@vielzeug/archive/worker';
import { s } from '@vielzeug/spell';

// The collection's payload: one strict schema is the whole content contract.
const payloadSchema = s.object({
  cuisine: s.enum(['italian', 'japanese']),
  ingredients: s.array(s.string().trim().min(1).max(64)).min(1).max(20),
  name: s.string().trim().min(1).max(32),
});

const recipesCollection = defineArchiveCollection({
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

// The whole Worker: routing, auth, guards, limits, SQL and DTO disciplines included.
export default createArchiveWorker([recipesCollection]);
```

The browser side never imports worker machinery. The same collection's composed
schemas parse what the routes emit:

```ts
import { defineArchiveCollection } from '@vielzeug/archive';
import { s } from '@vielzeug/spell';

const notes = defineArchiveCollection({
  name: 'notes', contentVersion: 1,
  payloadSchema: s.object({ title: s.string().min(1).max(128) }),
  index: ({ title }) => ({ title, filter: null, tags: [] }),
});
const response = await fetch('/api/v1/collections/notes/entries?sort=liked');
if (!response.ok) throw new Error('Archive unavailable');
const parsed = notes.contract.page.parse(await response.json());
console.log(parsed.entries);
```

## Features

<div class="features-grid">

- `defineArchiveCollection` — the one content seam: payload schema, canonicalization, filter/tag/title derivation, union-typed vocabularies
- `createArchiveWorker` — the whole routes/auth/limits/SQL stack from registered collections
- `collection.contract` — entry, page, publish/update input schemas shared by client and Worker
- `ARCHIVE_LIMITS` + `archiveHealthSchema` — the application bounds, advertised by health and validated on both sides
- `archiveAuthHealthSchema` + `AUTH_SCHEMA_VERSION` — typed issuer readiness checked against the issuer DDL stamp
- `archiveErrorResponseSchema` — the one error envelope, code-typed across the wire
- `createAuthWorker` — scanner-safe confirmation, live session-version enforcement, durable budgets, metadata export and coordinated erasure
- `AUTH_ISSUER_SERVICE` — required uncached issuer check after local catalog JWT verification
- `ArchiveDerivationError` — distinguishes faulty collection code from invalid submitted content
- Moderation — reader reports, the operator soft-hide and the report queue, keyed on a verified `roles` claim
- `worker.tap()` / `issuer.tap()` — typed sanitized runtime events; neither core logs by default
- `migrations/` — canonical fresh-database DDL with the storage stamp health reads back; no upgrade framework

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md) — stand up a collection, deploy the Worker, wire the client.
- [API Reference](./api.md) — every export, all three entry points, the full route table.
- [Examples](./examples.md) — recipes from first deployment to GDPR erasure.
- [Release Status](./migration.md) — unreleased package and fresh-database scope.

</div>

## See Also

<div class="see-also">

- [Spell](/spell/) — every payload schema here is a spell schema; the core composes envelopes from it.
- [Courier](/courier/) — the HTTP client shape an app's frontend mirrors to consume these routes.
- [Rune](/rune/) — the structured logger a deployment points `worker.tap()` events at.

</div>

<!-- markdownlint-enable MD060 MD033 MD025 -->

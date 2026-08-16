---
title: Scout Migration
description: Migrate Scout index configuration and corpus updates to Scout.
---

[[toc]]

## Scout 2 Changes

Scout 2 adds `setItems()` for refreshed corpora, validates numeric search configuration, and replaces `ScoutIndexError` with `ScoutConfigurationError`, removes the unused `ScoutError.is()` type guard and exposes `revision` as a readonly property on the `ScoutIndex` interface.

### Replace `ScoutError.is()` with `instanceof`

The static `ScoutError.is()` type guard is removed. Use `instanceof ScoutError` to narrow unknown values to the Scout error hierarchy.

```ts
// Scout 2
if (ScoutError.is(err)) { ... }

// Scout 3
if (err instanceof ScoutError) { ... }
```

### Use `index.revision` for cache invalidation

The internal `_index-state` side-channel is removed. `ScoutIndex` now exposes `revision` as a readonly property — a monotonically increasing counter incremented after every changed mutation. Use it directly when caching search results outside the index.

```ts
// Scout 2 — internal side-channel (no public API)
// toSearchMatcher() used a private WeakMap to track index revisions

// Scout 3 — public readonly property
const revision = index.revision;
```

`toSearchMatcher()` now reads `index.revision` directly. External code that cached search results can use the same property.

Removed export:

- `ScoutIndexError`

Added export:

- `ScoutConfigurationError`

## Replace `ScoutIndexError`

```ts
// Scout 1
import { ScoutIndexError } from '@vielzeug/scout';
```

```ts
// Scout 2
import { ScoutConfigurationError } from '@vielzeug/scout';
```

`ScoutConfigurationError` covers invalid index fields, search constraints, and reactive debounce settings.

## Fix Invalid Numeric Options

Scout 1 accepted several invalid numeric values. Scout 2 rejects them with `ScoutConfigurationError`.

| Option | Scout 2 domain              |
| --- |-----------------------------|
| field `weight` | finite, greater than `0`    |
| `threshold` | finite, `0..1`              |
| `limit` | finite non-negative integer |
| `minQueryLength` | finite positive integer     |
| `debounce` | finite non-negative integer |

```ts
// Scout 1: negative limit returned no results
index.search('alice', { limit: -1 });

// Scout 2: use zero to request no results
index.search('alice', { limit: 0 });
```

## Reconcile Refreshed Corpora

Use `setItems()` instead of coordinating `items`, `add()`, `remove()`, and `reindex()` yourself.

```ts
// Scout 1
const existing = new Set(index.items);
const incoming = new Set(latestUsers);

for (const item of existing) {
  if (!incoming.has(item)) index.remove(item);
}

for (const item of latestUsers) {
  if (!existing.has(item)) index.add(item);
  else index.reindex(item);
}
```

```ts
// Scout 2
index.setItems(latestUsers);
```

`setItems()` uses reference identity, reindexes retained items, adopts incoming first-occurrence order, collapses duplicate references, and emits one mutation notification only when indexed values, membership, or order changes.

## Highlighting

`findMatchRanges(text, query)` now accepts raw query text and normalizes punctuation and whitespace with Scout's tokenizer. `SearchResult.matches` stays unchanged: it contains literal normalized-token ranges and can be empty for a fuzzy-only candidate.

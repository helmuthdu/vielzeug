---
title: Scout Migration
description: Migrate Scout index configuration and corpus updates to Scout.
---

[[toc]]

## Scout 2 Changes

Scout 2 adds `setItems()` for refreshed corpora, validates numeric search configuration, and replaces `ScoutIndexError` with `ScoutConfigurationError`.

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

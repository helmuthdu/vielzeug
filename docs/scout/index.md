---
title: Scout — Fast fuzzy search for TypeScript
description: Trigram-indexed fuzzy search with per-field weights, match highlighting, and an optional reactive layer.
package: scout
category: utilities
keywords: [fuzzy-search, search, trigram, full-text, filter, highlight, reactive, ripple]
exports:
  [
    createIndex,
    createReactiveSearch,
    createSearch,
    findMatchRanges,
    highlight,
    highlightField,
    toFilterPredicate,
    toSearchFn,
  ]
related: [arsenal, sourcerer, vault, ripple]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="scout" />

## Why Scout?

Arsenal's `fuzzy` / `fuzzyFilter` helpers perform pairwise Levenshtein distance — O(n·m) per item per query. For ≤200 items they are fine. For 500–100k items with real-time keystrokes, you need an index.

Scout builds a **trigram inverted index** at construction time. Query time is O(candidates) — only items that share at least one trigram with the query are scored, so performance stays flat as the corpus grows.

| Feature                  | Arsenal `fuzzy*`                               | Scout `createIndex`                                                                       | Fuse.js                                        |
| ------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Bundle size              | ~3 KB                                          | <PackageInfo package="scout" type="size" />                                               | ~23 KB                                         |
| Zero dependencies        | <sg-icon name="check" size="16"></sg-icon>     | <sg-icon name="triangle-alert" size="16"></sg-icon> `@vielzeug/ripple` peer (reactive layer only) | <sg-icon name="check" size="16"></sg-icon>     |
| Algorithm                | Levenshtein                                    | Trigram + Dice coefficient                                                                | Bitap                                          |
| Query time               | O(n·m)                                         | O(candidates)                                                                             | O(n·m)                                         |
| Stateful index           | <sg-icon name="x" size="16"></sg-icon>         | <sg-icon name="check" size="16"></sg-icon>                                                | <sg-icon name="check" size="16"></sg-icon>     |
| Match highlighting       | <sg-icon name="x" size="16"></sg-icon>         | <sg-icon name="check" size="16"></sg-icon>                                                | <sg-icon name="check" size="16"></sg-icon>     |
| Reactive layer           | <sg-icon name="x" size="16"></sg-icon>         | ripple signals + debounce                                                                 | <sg-icon name="x" size="16"></sg-icon>         |
| Incremental updates      | <sg-icon name="x" size="16"></sg-icon>         | <sg-icon name="check" size="16"></sg-icon>                                                | Partial                                        |

<div class="decision-callout">

**Use Scout when** you need search over 500+ items, real-time UI search boxes (combobox, command palette), or reactive query state with ripple signals.

**Consider `arsenal.fuzzyFilter` when** you have fewer than 200 items and don't need a persistent index.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/scout
```

```sh [npm]
npm install @vielzeug/scout
```

```sh [yarn]
yarn add @vielzeug/scout
```

:::

## Quick Start

```ts
import { createIndex } from '@vielzeug/scout';

const index = createIndex(users, {
  fields: [
    { field: 'name', weight: 2 }, // name ranks higher
    { field: 'email' },
  ],
});

const results = index.search('alice');
// [{ item: User, score: 0.85, matches: [{ field: 'name', ranges: [[0, 5]] }] }]
```

## Features

<div class="features-grid">

- `createIndex()` — Trigram inverted index; construction O(corpus × field_length), query O(candidates)
- Per-field weights — Promote `name` matches over secondary fields; any field accepts a custom `stringify`
- `createReactiveSearch()` — Index + reactive `SearchState` in one call; `.index` for incremental mutations
- `createSearch()` — Reactive search state backed by an existing `ScoutIndex`; share one index across many states
- `highlight()` / `highlightField()` — Split field text into `HighlightPart[]` fragments for styled rendering
- `findMatchRanges()` — Compute match ranges for custom display strings (truncated previews, formatted values)
- `toSearchFn()` — Drop-in `searchFn` adapter for sourcerer's `LocalSource`
- `toFilterPredicate()` — Snapshot `(item: T) => boolean` predicate for `Array.filter` or vault queries
- Incremental updates — `add()` / `remove()` / `reindex()` patch the index in O(field_length); no full rebuild

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Arsenal](/arsenal/) — Use `fuzzyFilter` for ad-hoc filtering of small lists (< 200 items) without building an index
- [Ripple](/ripple/) — `createReactiveSearch()` and `createSearch()` use Ripple signals for reactive query state and debounce
- [Sourcerer](/sourcerer/) — `toSearchFn()` adapts a `ScoutIndex` as a drop-in `searchFn` for `createLocalSource`
- [Vault](/vault/) — `toFilterPredicate()` wraps a one-time Scout query as a vault-compatible `filter()` predicate

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->

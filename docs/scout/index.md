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
    ScoutConfigurationError,
    ScoutDisposedError,
    ScoutError,
    debugSearch,
    findMatchRanges,
    highlight,
    highlightField,
    segmentWords,
    toFilterPredicate,
    toSearchMatcher,
  ]
related: [arsenal, sourcerer, vault, ripple]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="scout" />

## Why Scout?

Arsenal's `fuzzy` / `fuzzyFilter` helpers perform pairwise Levenshtein distance — O(n·m) per item per query. For ≤200 items they are fine. For 500–100k items with real-time keystrokes, you need an index.

Scout builds a **trigram inverted index** at construction time. Query time scores only items sharing a trigram with the query; broad queries can still approach O(n), while selective queries avoid scoring the whole corpus.

```ts
// Before
const matches = users.filter((user) => user.name.toLowerCase().includes(query.toLowerCase()));

// After
import { createIndex } from '@vielzeug/scout';

const index = createIndex(users, { fields: ['name', 'email'] });
const matches = index.search(query);
```

| Feature                  | Arsenal `fuzzy*`                               | Scout `createIndex`                                                                       | Fuse.js                                        |
| ------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Bundle size              | ~3 KB                                          | <PackageInfo package="scout" type="size" />                                               | ~23 KB                                         |
| Zero dependencies        | <ore-icon name="check" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon> `@vielzeug/ripple` runtime dependency | <ore-icon name="check" size="16"></ore-icon>     |
| Algorithm                | Levenshtein                                    | Trigram + overlap coefficient                                                             | Bitap                                          |
| Query time               | O(n·m)                                         | O(candidates)                                                                             | O(n·m)                                         |
| Stateful index           | <ore-icon name="x" size="16"></ore-icon>         | <ore-icon name="check" size="16"></ore-icon>                                                | <ore-icon name="check" size="16"></ore-icon>     |
| Match highlighting       | <ore-icon name="x" size="16"></ore-icon>         | <ore-icon name="check" size="16"></ore-icon>                                                | <ore-icon name="check" size="16"></ore-icon>     |
| Reactive layer           | <ore-icon name="x" size="16"></ore-icon>         | ripple signals + debounce                                                                 | <ore-icon name="x" size="16"></ore-icon>         |
| Incremental updates      | <ore-icon name="x" size="16"></ore-icon>         | <ore-icon name="check" size="16"></ore-icon>                                                | Partial                                        |

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

const users = [
  { email: 'ada@example.com', name: 'Ada Lovelace' },
  { email: 'grace@example.com', name: 'Grace Hopper' },
];

const index = createIndex(users, {
  fields: [
    { field: 'name', weight: 2 },
    { field: 'email' },
  ],
});

const results = index.search('ada');
console.log(results[0]?.item.name); // Ada Lovelace
```

## Features

<div class="features-grid">

- `createIndex()` — Trigram inverted index; construction O(corpus × field_length), query O(candidates)
- Per-field weights — Promote `name` matches over secondary fields; finite positive weights and custom `stringify` functions supported
- `createReactiveSearch()` — Index + reactive `SearchState` in one call; `.index` for incremental mutations
- `createSearch()` — Reactive search state backed by an existing `ScoutIndex`; share one index across many states
- `highlight()` / `highlightField()` — Split field text into `HighlightPart[]` fragments for styled rendering
- `findMatchRanges()` — Compute match ranges for custom display strings (truncated previews, formatted values)
- `toSearchMatcher()` — Matcher adapter for sourcerer's `LocalSource`
- `toFilterPredicate()` — Snapshot `(item: T) => boolean` predicate for `Array.filter` or vault queries
- `setItems()` — Reconcile a refreshed corpus by reference, preserve incoming order, and notify once
- Incremental updates — `add()` / `remove()` / `reindex()` patch individual items in O(field_length)
- `onMutate()` — Subscribe to index mutations; powers `createSearch()`'s reactivity and bulk reconciliation
- `segmentWords()` — Split unsegmented-script text (CJK, Thai, ...) into words via native `Intl.Segmenter`
- Debug logging via `debugSearch()` (`@vielzeug/scout/devtools`) — logs query/results transitions, tree-shaken from production bundles

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Arsenal](/arsenal/) — Use `fuzzyFilter` for ad-hoc filtering of small lists (< 200 items) without building an index
- [Ripple](/ripple/) — `createReactiveSearch()` and `createSearch()` use Ripple signals for reactive query state and debounce
- [Sourcerer](/sourcerer/) — use a `ScoutIndex` inside `createLocalSource`'s explicit `match` callback
- [Vault](/vault/) — `toFilterPredicate()` wraps a one-time Scout query as a vault-compatible `filter()` predicate

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->

---
title: 'Scout: API Reference'
description: 'Complete API reference for @vielzeug/scout: createIndex, createSearch, highlight, highlightField, toSearchMatcher, toFilterPredicate.'
---

[[toc]]

## API Overview

| Symbol                   | Purpose                                                   | Execution mode | Common gotcha                                                                        |
| ------------------------ | --------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------ |
| `createIndex()`          | Build trigram index from an item array                    | Sync           | Index is built at call time: pass all initial items                                  |
| `ScoutIndex.search()`    | Query the index, returns scored + highlighted results     | Sync           | Empty query returns all items with `score = 1`                                       |
| `ScoutIndex.add()`       | Add one item to the index                                 | Sync           | An existing key adopts the new object; without a `key`, same reference is a no-op    |
| `ScoutIndex.remove()`    | Remove the item stored under `key(item)`                  | Sync           | No-op for unknown keys                                                               |
| `ScoutIndex.removeKey()` | Remove the item stored under a raw key                    | Sync           | Returns whether an item was removed                                                  |
| `ScoutIndex.reindex()`   | Store `item` under its key and reindex changed fields     | Sync           | With a `key`, a fresh copy of the item is enough; no-op for unknown keys             |
| `ScoutIndex.setItems()`  | Reconcile a refreshed corpus in one mutation              | Sync           | Uses key identity (reference by default); equal fresh copies notify nothing          |
| `ScoutIndex.items`       | All indexed items in insertion order                      | Sync           | Returns a new array snapshot each call                                               |
| `ScoutIndex.revision`    | Monotonic counter incremented after each mutation         | Sync           | Use as a cache-busting token for external result caches                              |
| `ScoutIndex.subscribe()` | Subscribe to changed index mutations                      | Sync           | A changed `setItems()` reconciliation emits once; no-ops emit nothing                |
| `createSearch()`         | Atomic search store backed by a `ScoutIndex`              | Sync           | Read one snapshot and dispose the store when done                                    |
| `findMatchRanges()`      | Compute match ranges for a text + query pair              | Sync           | Returns sorted, non-overlapping `[start, end)` ranges in the original text           |
| `highlight()`            | Split text into highlighted/unhighlighted fragments       | Sync           | Ranges must be sorted and non-overlapping                                            |
| `highlightField()`       | Highlight a named field from a `SearchResult`             | Sync           | Shorthand for the `matches.find(…).ranges → highlight()` pattern                     |
| `toSearchMatcher()`      | Adapt `ScoutIndex` to Sourcerer's local `filter` callback | Sync           | Recomputes cached query matches after index mutation                                 |
| `toFilterPredicate()`    | Snapshot predicate from a one-time query                  | Sync           | Re-call when query or corpus changes                                                 |
| `segmentWords()`         | Split unsegmented-script text (CJK, Thai, ...) into words | Sync           | Uses native `Intl.Segmenter`: not applied inside `normalize()` itself (see Pitfalls) |

## Package Entry Point

| Import            | Purpose                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `@vielzeug/scout` | All exports: index/search/highlighting/adapters, `ScoutConfigError`, `ScoutDisposedError`, `ScoutError`, and all types |

---

## `createIndex(items, options)`

Builds a trigram inverted index from `items`. Construction is O(corpus × field_length); subsequent `search()` calls are O(candidates). With a `key`, construction throws `ScoutConfigError` when two different items share one key, matching `setItems()`.

```ts
function createIndex<T>(items: readonly T[], options: ScoutIndexOptions<T>): ScoutIndex<T>;
```

**Parameters**

| Param                    | Type                         | Description                                                                                                        |
| ------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `items`                  | `readonly T[]`               | Initial corpus to index.                                                                                           |
| `options.fields`         | `ReadonlyArray<FieldDef<T>>` | Fields to index. Required; at least one entry.                                                                     |
| `options.key`            | `(item: T) => unknown`       | Stable item identity for `add`/`remove`/`reindex`/`setItems` (default: object reference).                          |
| `options.threshold`      | `number`                     | Finite query-coverage score in `0..1` (default `0.2`).                                                             |
| `options.limit`          | `number`                     | Finite non-negative integer max results (default `50`).                                                            |
| `options.minQueryLength` | `number`                     | Finite positive integer min chars before trigram scoring; shorter queries use O(n) containment scan (default `3`). |

**Example**

```ts
import { createIndex } from '@vielzeug/scout';

const products = [
  { sku: 'WGT-001', title: 'Widget Pro' },
  { sku: 'GAD-002', title: 'Gadget Plus' },
];

const index = createIndex(products, {
  fields: [{ field: 'title', weight: 2 }, { field: 'sku' }],
  threshold: 0.25,
  limit: 20,
});
```

---

## `ScoutIndex<T>`

Returned by `createIndex()`.

### `.search(query, options?)`

```ts
search(query: string, options?: SearchConstraints): SearchResult<T>[]
```

Returns results sorted by score descending. Empty query returns all items with `score = 1`. Results below `threshold` are excluded; at most `limit` results are returned.

```ts
const results = index.search('alice');
// [{ item, score, matches }]
```

### `.add(item)`

Adds `item` to the index. If another object is already stored under `key(item)`, that record adopts `item` and its changed fields are reindexed (no notification when nothing changed); without a custom `key`, re-adding the same reference is a no-op. O(field_length).

### `.remove(item)`

Removes the item stored under `key(item)`. No-op if not found. O(field_length).

### `.removeKey(key)`

```ts
removeKey(key: unknown): boolean
```

Removes the item stored under `key` and returns whether an item was removed. Use with a custom `key` to delete by id without fabricating a `T`.

### `.reindex(item)`

Stores `item` under `key(item)`, re-reads its field values, and rebuilds its index entry in-place, updating only fields whose text changed. Preserves insertion order. With a custom `key`, passing a fresh copy of the item is enough. No-op if the key is not in the index.

```ts
item.name = 'new name';
index.reindex(item);
```

### `.setItems(items)`

```ts
setItems(items: readonly T[]): void
```

Reconciles the index to a refreshed corpus in one mutation by key identity (reference identity by default). Retained items adopt their incoming object and are reindexed, missing keys are removed, added keys are indexed, and incoming first-occurrence order becomes index order. Duplicate references collapse to one item; two different objects sharing one key throw `ScoutConfigError`. Calls `subscribe()` listeners once when indexed field text, membership, or order changed — reconciling an equal corpus of fresh copies notifies nothing.

```ts
index.setItems(latestUsers);
```

### `.size`

`number`: current number of indexed items.

### `.items`

`readonly T[]`: all indexed items in insertion order — the latest object stored for each key. Returns a new array snapshot each call.

```ts
const all = index.items;
```

### `.subscribe(listener)`

```ts
subscribe(listener: () => void): () => void
```

Subscribes `listener` to run after every changed `add()` / `remove()` / `reindex()` / `setItems()` operation. No-ops, including unchanged bulk reconciliation, do not fire it. A changed `setItems()` reconciliation fires once. `createSearch()` uses this internally to keep `results` in sync with index mutations; most callers building on `createIndex()` directly will not need it.

```ts
const unsubscribe = index.subscribe(() => {
  console.log(`Index changed: now ${index.size} items`);
});

index.add(newUser); // logs "Index changed: now 6 items"
unsubscribe();
```

### `.revision`

`number`: monotonically increasing counter, incremented after every changed `add()` / `remove()` / `reindex()` / `setItems()` operation. Use as a cache-busting token when caching search results outside the index: `toSearchMatcher()` uses it for this purpose.

---

## `createSearch(index, options?)`

Wraps a `ScoutIndex` in a zero-dependency external store. `getSnapshot()` returns the current query, loading flag, and results as one consistent snapshot; `subscribe()` notifies after the complete snapshot is committed.

```ts
function createSearch<T>(index: ScoutIndex<T>, options?: CreateSearchOptions): SearchState<T>;
```

**Parameters**

| Param                    | Type     | Description                                                                                                   |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------- |
| `options.debounce`       | `number` | Finite non-negative integer milliseconds before query commit (default `200`). Pass `0` for immediate updates. |
| `options.limit`          | `number` | Finite non-negative integer override of index-level limit.                                                    |
| `options.threshold`      | `number` | Finite `0..1` override of index-level threshold.                                                              |
| `options.minQueryLength` | `number` | Finite positive integer override of index-level minimum query length.                                         |

**Returns `SearchState<T>`**

| Member                          | Type                                 | Description                                                                          |
| ------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| `getSnapshot()`                 | `() => SearchSnapshot<T>`            | Returns the stable current snapshot. Identity changes only after a state transition. |
| `setQuery(query)`               | `(query: string) => void`            | Starts or immediately commits a query according to `debounce`.                       |
| `subscribe(listener, options?)` | `(listener, options?) => () => void` | Notifies after an atomic snapshot commit. Supports `{ signal }` cleanup.             |
| `disposalSignal`                | `AbortSignal`                        | Aborted when `dispose()` is called. Use to tie other lifecycles to this search.      |
| `disposed`                      | `boolean`                            | `true` after `dispose()` has been called.                                            |
| `clear()`                       | `() => void`                         | Resets query, cancels debounce, and restores empty-query results synchronously.      |
| `dispose()`                     | `() => void`                         | Releases timers and subscriptions.                                                   |
| `[Symbol.dispose]()`            | `() => void`                         | `using`-compatible disposal.                                                         |

**Example**

```ts
import { createIndex, createSearch } from '@vielzeug/scout';

const users = [{ name: 'Ada Lovelace' }, { name: 'Grace Hopper' }];
const index = createIndex(users, { fields: ['name'] });
const search = createSearch(index, { debounce: 150 });

search.subscribe(() => {
  console.log(search.getSnapshot().results.map((result) => result.item.name));
});

search.setQuery('ada');
```

---

## `findMatchRanges(text, query)`

Normalizes `text` and `query` with Scout's shared normalization (lowercase, punctuation to single spaces, Latin-only accent folding), matches the whole normalized query as a phrase first, then each word individually — a one-character word matches only at a word start — merges overlaps, and maps the ranges back to the original string. Useful when you need to apply highlighting to a different string than the indexed field value (e.g. a truncated preview or a differently formatted display string).

```ts
function findMatchRanges(text: string, query: string): [number, number][];
```

**Example**

```ts
import { findMatchRanges, highlight } from '@vielzeug/scout';

const ranges = findMatchRanges('Alice Johnson', 'alice!');
// [[0, 5]]

const parts = highlight('Alice Johnson', ranges);
// [{ text: 'Alice', highlighted: true }, { text: ' Johnson', highlighted: false }]
```

Returns an empty array if either `text` or `query` is empty.

---

## `highlight(text, ranges)`

Splits `text` into `HighlightPart[]` fragments based on `ranges` from `FieldMatch.ranges`.

```ts
function highlight(text: string, ranges: [number, number][]): HighlightPart[];
```

**Example**

```ts
import { highlight } from '@vielzeug/scout';

highlight('Hello World', [[0, 5]]);
// [{ text: 'Hello', highlighted: true }, { text: ' World', highlighted: false }]
```

Returns an empty array when `text` is empty. Returns a single unhighlighted part when `ranges` is empty.

---

## `highlightField(result, field, text)`

Convenience shorthand that finds the match ranges for `field` in `result.matches` and calls `highlight()` in one step. Eliminates the manual `result.matches.find(m => m.field === …).ranges` lookup.

```ts
function highlightField<T>(result: SearchResult<T>, field: keyof T & string, text: string): HighlightPart[];
```

**Example**

```ts
import { createIndex, highlightField } from '@vielzeug/scout';

const users = [{ name: 'Alice Johnson' }];
const index = createIndex(users, { fields: ['name'] });

for (const result of index.search('alice')) {
  const parts = highlightField(result, 'name', result.item.name);
  console.log(parts.map((part) => (part.highlighted ? `[${part.text}]` : part.text)).join(''));
}
```

When the field has no match (e.g. the query matched via a different field), returns a single unhighlighted part.

---

## `toSearchMatcher(index, options?)`

Returns an `(item, query) => boolean` matcher compatible with Sourcerer's local `filter` option.

```ts
function toSearchMatcher<T>(index: ScoutIndex<T>, options?: SearchConstraints): (item: T, query: string) => boolean;
```

One matching-item set is cached per query and index revision, so filtering does not repeat index work per item and stays current after index mutation.

```ts
import { createIndex, toSearchMatcher } from '@vielzeug/scout';
import { createLocalSource } from '@vielzeug/sourcerer';

const users = [{ email: 'ada@example.com', name: 'Ada Lovelace' }];
const index = createIndex(users, { fields: ['name', 'email'] });
const source = createLocalSource(users, { filter: toSearchMatcher(index), params: '' });

source.setParams('ada');
```

---

## `toFilterPredicate(index, query, options?)`

Returns a `(item: T) => boolean` predicate computed from a one-time query. Use with `Array.filter` or vault's `query.filter()`.

```ts
function toFilterPredicate<T>(index: ScoutIndex<T>, query: string, options?: SearchConstraints): (item: T) => boolean;
```

The predicate is a snapshot: re-call `toFilterPredicate` if the query or corpus changes.

```ts
import { createIndex, toFilterPredicate } from '@vielzeug/scout';

const products = [{ title: 'Widget Pro' }, { title: 'Gadget Plus' }];
const index = createIndex(products, { fields: ['title'] });
const results = products.filter(toFilterPredicate(index, 'widget'));

const top5 = products.filter(toFilterPredicate(index, 'widget', { limit: 5 }));
```

---

## `segmentWords(text)`

Splits `text` into whitespace-joined word segments using the runtime's native `Intl.Segmenter`: no dependency beyond the platform API. Falls back to returning `text` unchanged where `Intl.Segmenter` isn't available.

```ts
function segmentWords(text: string): string;
```

`normalize()`'s trigram-based scoring already works on unsegmented scripts (Chinese, Japanese, Thai, ...) without this: trigrams are generated per-character, not per-word. `segmentWords()` is for `findMatchRanges()` highlighting and its phrase matching, which assume space-separated words. **Not applied inside `normalize()` itself**: benchmarked at ~15x slower than the plain regex path for the common whitespace-delimited case, which would regress `createIndex()`'s construction cost for every caller, not just those indexing unsegmented scripts.

**Example**

```ts
import { createIndex, segmentWords } from '@vielzeug/scout';

const documents = [{ title: '日本語を勉強しています' }];
const index = createIndex(documents, {
  fields: [{ field: 'title', stringify: (value) => segmentWords(String(value)) }],
});
```

---

## Types

### `SearchConstraints`

Shared search-tuning knobs used by `ScoutIndexOptions`, `CreateSearchOptions`, and all search functions.

```ts
type SearchConstraints = {
  limit?: number; // finite non-negative integer; default 50
  minQueryLength?: number; // finite positive integer; default 3
  threshold?: number; // finite 0..1 value; default 0.2
};
```

### `FieldDef<T>`

```ts
type FieldDef<T> =
  | (keyof T & string)
  | {
      field: keyof T & string;
      weight?: number; // default 1
      stringify?: (value: unknown) => string;
    };
```

### `ScoutIndexOptions<T>`

```ts
type ScoutIndexOptions<T> = SearchConstraints & {
  fields: ReadonlyArray<FieldDef<T>>;
  key?: (item: T) => unknown; // stable identity; default (item) => item
};
```

### `CreateSearchOptions`

```ts
type CreateSearchOptions = SearchConstraints & {
  debounce?: number; // finite non-negative integer; default 200
};
```

### `SearchResult<T>`

```ts
type SearchResult<T> = {
  item: T;
  matches: FieldMatch<keyof T & string>[]; // literal [start, end) ranges in original field values; empty for fuzzy-only results
  score: number; // weighted query coverage in [0, 1]; 1 when query is empty
};
```

### `FieldMatch<F>`

Generic over the union of field names: `match.field` is typed to the actual fields of `T`.

```ts
type FieldMatch<F extends string = string> = {
  field: F;
  ranges: [number, number][]; // literal [start, end) ranges in the original field value
};
```

### `HighlightPart`

```ts
type HighlightPart = {
  highlighted: boolean;
  text: string;
};
```

### `SearchSnapshot<T>`

```ts
type SearchSnapshot<T> = Readonly<{
  isSearching: boolean;
  query: string;
  results: ReadonlyArray<SearchResult<T>>;
}>;
```

Snapshots and their result arrays are frozen at runtime.

### `SearchState<T>`

```ts
type SearchState<T> = {
  readonly disposalSignal: AbortSignal;
  readonly disposed: boolean;
  clear(): void;
  dispose(): void;
  getSnapshot(): SearchSnapshot<T>;
  setQuery(query: string): void;
  subscribe(listener: () => void, options?: { signal?: AbortSignal }): () => void;
  [Symbol.dispose](): void;
};
```

`subscribe()` observers are notified after the full snapshot commits. An observer error is reported asynchronously after the remaining observers run.

---

## Errors

### `ScoutError`

Base class for all scout errors. Use `instanceof ScoutError` to catch any scout-originated error.

```ts
class ScoutError extends Error {}
```

**Named subclasses**

| Class                | Thrown when                                                                    |
| -------------------- | ------------------------------------------------------------------------------ |
| `ScoutConfigError`   | An index or search receives invalid fields, numeric options, or duplicate keys |
| `ScoutDisposedError` | A method is called on a disposed `SearchState` instance                        |

## Entry Ranking

Reference lists: glossaries, rule compendiums, profile directories: rank and render through the same helpers.

### `rankEntries(entries, query, options?)`

Orders `RankableEntry` items (`{ id, label, meta, text }`) by how directly they match the query: exact label, label prefix, label contains, meta contains, text contains, and finally `options.fuzzyIds` hits as last resort. Non-matching entries drop; ties break alphabetically. A blank query returns every entry.

### `dedupeEntries(entries)`

Drops entries whose label and body text are identical to an earlier entry (case-insensitive): alias rows in merged catalogs.

### `splitPattern(text, pattern)`

Splits text on a global regular expression, marking matched pieces (`SplitSegment`), for rendering keyword links over prose. A `null` pattern keeps the text whole.

### `escapeRegExp(value)`

Escapes a literal for embedding in a regular expression: build keyword patterns from display names.

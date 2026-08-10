---
title: Scout — API Reference
description: Complete API reference for @vielzeug/scout — createIndex, createReactiveSearch, createSearch, highlight, highlightField, toSearchMatcher, toFilterPredicate.
---

[[toc]]

## API Overview

| Symbol                    | Purpose                                               | Execution mode | Common gotcha                                                 |
| ------------------------- | ----------------------------------------------------- | -------------- | ------------------------------------------------------------- |
| `createIndex()`           | Build trigram index from an item array                | Sync           | Index is built at call time — pass all initial items          |
| `ScoutIndex.search()`     | Query the index, returns scored + highlighted results | Sync           | Empty query returns all items with `score = 1`                |
| `ScoutIndex.add()`        | Add one item to the index                             | Sync           | No-op if same reference already indexed                       |
| `ScoutIndex.remove()`     | Remove one item by reference                          | Sync           | No-op for unknown references                                  |
| `ScoutIndex.reindex()`    | Re-index a mutated item in-place; preserves order     | Sync           | Call after mutating item properties; no-op if not in index    |
| `ScoutIndex.setItems()`   | Reconcile a refreshed corpus in one mutation          | Sync           | Uses reference identity; duplicate references collapse        |
| `ScoutIndex.items`        | All indexed items in insertion order                  | Sync           | Returns a new array snapshot each call                        |
| `ScoutIndex.onMutate()`   | Subscribe to changed index mutations                   | Sync           | A changed `setItems()` reconciliation emits once; no-ops emit nothing |
| `createSearch()`          | Reactive search state backed by a `ScoutIndex`        | Sync           | Requires `@vielzeug/ripple` — dispose when done               |
| `createReactiveSearch()`  | One-call index + reactive search state                | Sync           | Exposes `.index` for incremental mutations                    |
| `findMatchRanges()`       | Compute match ranges for a text + query pair          | Sync           | Returns sorted, non-overlapping `[start, end]` ranges         |
| `highlight()`             | Split text into highlighted/unhighlighted fragments   | Sync           | Ranges must be sorted and non-overlapping                     |
| `highlightField()`        | Highlight a named field from a `SearchResult`         | Sync           | Shorthand for the `matches.find(…).ranges → highlight()` pattern |
| `toSearchMatcher()`            | Adapt `ScoutIndex` to Sourcerer's `match` callback    | Sync           | Recomputes cached query matches after index mutation          |
| `toFilterPredicate()`     | Snapshot predicate from a one-time query              | Sync           | Re-call when query or corpus changes                          |
| `segmentWords()`          | Split unsegmented-script text (CJK, Thai, ...) into words | Sync       | Uses native `Intl.Segmenter` — not applied inside `tokenize()` itself (see Pitfalls) |
| `debugSearch()`           | Log a `SearchState`'s query/results transitions       | Sync           | Import from `@vielzeug/scout/devtools`, not the main entry point |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/scout` | All exports — index/search/highlighting/adapters, `ScoutConfigurationError`, `ScoutDisposedError`, `ScoutError`, and all types |
| `@vielzeug/scout/devtools` | `debugSearch` — reactive search state logger (dev only) |

---

## `createIndex(items, options)`

Builds a trigram inverted index from `items`. Construction is O(corpus × field_length); subsequent `search()` calls are O(candidates).

```ts
function createIndex<T>(items: T[], options: ScoutIndexOptions<T>): ScoutIndex<T>
```

**Parameters**

| Param | Type | Description |
| --- | --- | --- |
| `items` | `T[]` | Initial corpus to index. |
| `options.fields` | `ReadonlyArray<FieldDef<T>>` | Fields to index. Required; at least one entry. |
| `options.threshold` | `number` | Finite overlap score in `0..1` (default `0.2`). |
| `options.limit` | `number` | Finite non-negative integer max results (default `50`). |
| `options.minQueryLength` | `number` | Finite positive integer min chars before trigram scoring; shorter queries use O(n) containment scan (default `3`). |

**Example**

```ts
import { createIndex } from '@vielzeug/scout';

const products = [
  { sku: 'WGT-001', title: 'Widget Pro' },
  { sku: 'GAD-002', title: 'Gadget Plus' },
];

const index = createIndex(products, {
  fields: [
    { field: 'title', weight: 2 },
    { field: 'sku' },
  ],
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

Adds `item` to the index. No-op if the same reference is already indexed. O(field_length).

### `.remove(item)`

Removes `item` by reference equality. No-op if not found. O(field_length).

### `.reindex(item)`

Re-reads the item's current field values and rebuilds its index entry in-place, updating only fields whose values changed. Preserves insertion order. No-op if the item is not in the index.

```ts
item.name = 'new name';
index.reindex(item);
```

### `.setItems(items)`

```ts
setItems(items: readonly T[]): void
```

Reconciles the index to a refreshed corpus in one mutation. Existing references are reindexed, missing references are removed, added references are indexed, and incoming first-occurrence order becomes index order. Duplicate references collapse to one item. Calls `onMutate()` once when indexed values, membership, or order changes.

```ts
index.setItems(latestUsers);
```

### `.size`

`number` — current number of indexed items.

### `.items`

`readonly T[]` — all indexed items in insertion order. Returns a new array snapshot each call.

```ts
const all = index.items;
```

### `.onMutate(listener)`

```ts
onMutate(listener: () => void): () => void
```

Subscribes `listener` to run after every changed `add()` / `remove()` / `reindex()` / `setItems()` operation. No-ops, including unchanged bulk reconciliation, do not fire it. A changed `setItems()` reconciliation fires once. `createSearch()` uses this internally to keep `results` in sync with index mutations; most callers building on `createIndex()` directly will not need it.

```ts
const unsubscribe = index.onMutate(() => {
  console.log(`Index changed — now ${index.size} items`);
});

index.add(newUser); // logs "Index changed — now 6 items"
unsubscribe();
```

---

## `createSearch(index, options?)`

Wraps a `ScoutIndex` in a reactive search state powered by `@vielzeug/ripple` signals.

```ts
function createSearch<T>(index: ScoutIndex<T>, options?: CreateSearchOptions): SearchState<T>
```

**Parameters**

| Param | Type | Description |
| --- | --- | --- |
| `options.debounce` | `number` | Finite non-negative integer milliseconds before query commit (default `200`). Pass `0` for immediate updates. |
| `options.limit` | `number` | Finite non-negative integer override of index-level limit. |
| `options.threshold` | `number` | Finite `0..1` override of index-level threshold. |
| `options.minQueryLength` | `number` | Finite positive integer override of index-level minimum query length. |

**Returns `SearchState<T>`**

| Member | Type | Description |
| --- | --- | --- |
| `query` | `Signal<string>` | Writable search query. Set `.value` to trigger search. |
| `results` | `Computed<SearchResult<T>[]>` | Reactive results, updated after debounce. |
| `isSearching` | `Computed<boolean>` | `true` during the debounce window. |
| `clear()` | `() => void` | Resets query, cancels debounce, clears results synchronously. |
| `dispose()` | `() => void` | Releases all reactive subscriptions. |
| `[Symbol.dispose]()` | `() => void` | `using`-compatible disposal. |

**Example**

```ts
import { createIndex, createSearch } from '@vielzeug/scout';
import { effect } from '@vielzeug/ripple';

const users = [{ name: 'Ada Lovelace' }, { name: 'Grace Hopper' }];
const index = createIndex(users, { fields: ['name'] });
const search = createSearch(index, { debounce: 150 });

effect(() => {
  console.log(search.results.value.map((result) => result.item.name));
});

search.query.value = 'ada';
```

---

## `createReactiveSearch(items, options)`

Creates a `ScoutIndex` and a reactive `SearchState` in one call — the shorthand for `createIndex` + `createSearch`. Returns a `ReactiveSearch<T>` which extends `SearchState<T>` with a `.index` property for incremental mutations.

```ts
function createReactiveSearch<T>(
  items: T[],
  options: ScoutIndexOptions<T> & { debounce?: number },
): ReactiveSearch<T>
```

**Parameters**

| Param | Type | Description |
| --- | --- | --- |
| `items` | `T[]` | Initial corpus to index. |
| `options.fields` | `ReadonlyArray<FieldDef<T>>` | Fields to index. Required. |
| `options.debounce` | `number` | Finite non-negative integer debounce milliseconds (default `200`). |
| `options.threshold` | `number` | Finite overlap score in `0..1` (default `0.2`). |
| `options.limit` | `number` | Finite non-negative integer max results (default `50`). |
| `options.minQueryLength` | `number` | Finite positive integer min chars before trigram scoring (default `3`). |

**Returns `ReactiveSearch<T>`** — all `SearchState<T>` members plus:

| Member | Type | Description |
| --- | --- | --- |
| `index` | `ScoutIndex<T>` | The underlying index for `add`, `remove`, `reindex`. |

**Example**

```ts
import { createReactiveSearch } from '@vielzeug/scout';
import { effect } from '@vielzeug/ripple';

const users = [{ email: 'ada@example.com', name: 'Ada Lovelace' }];
const search = createReactiveSearch(users, {
  fields: [{ field: 'name', weight: 2 }, 'email'],
  debounce: 150,
});

effect(() => console.log(search.results.value.map((result) => result.item.name)));

search.index.add({ email: 'grace@example.com', name: 'Grace Hopper' });
search.dispose();
```

---

## `findMatchRanges(text, query)`

Normalizes raw `query` with Scout's tokenizer, then computes sorted, non-overlapping literal ranges for each normalized token within `text`. Useful when you need to apply highlighting to a different string than the indexed field value (e.g. a truncated preview or a differently formatted display string).

```ts
function findMatchRanges(text: string, query: string): [number, number][]
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
function highlight(text: string, ranges: [number, number][]): HighlightPart[]
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
function highlightField<T>(result: SearchResult<T>, field: keyof T & string, text: string): HighlightPart[]
```

**Example**

```ts
import { createIndex, highlightField } from '@vielzeug/scout';

const users = [{ name: 'Alice Johnson' }];
const index = createIndex(users, { fields: ['name'] });

for (const result of index.search('alice')) {
  const parts = highlightField(result, 'name', result.item.name);
  console.log(parts.map((part) => part.highlighted ? `[${part.text}]` : part.text).join(''));
}
```

When the field has no match (e.g. the query matched via a different field), returns a single unhighlighted part.

---

## `toSearchMatcher(index, options?)`

Returns an `(item, query) => boolean` matcher compatible with `sourcerer`'s `match` option.

```ts
function toSearchMatcher<T>(index: ScoutIndex<T>, options?: SearchConstraints): (item: T, query: string) => boolean
```

One matching-item set is cached per query and index revision, so filtering does not repeat index work per item and stays current after index mutation.

```ts
import { createIndex, toSearchMatcher } from '@vielzeug/scout';
import { createLocalSource } from '@vielzeug/sourcerer';

const users = [{ email: 'ada@example.com', name: 'Ada Lovelace' }];
const index = createIndex(users, { fields: ['name', 'email'] });
const source = createLocalSource(users, { match: toSearchMatcher(index) });
```

---

## `toFilterPredicate(index, query, options?)`

Returns a `(item: T) => boolean` predicate computed from a one-time query. Use with `Array.filter` or vault's `query.filter()`.

```ts
function toFilterPredicate<T>(
  index: ScoutIndex<T>,
  query: string,
  options?: SearchConstraints,
): (item: T) => boolean
```

The predicate is a snapshot — re-call `toFilterPredicate` if the query or corpus changes.

```ts
import { createIndex, toFilterPredicate } from '@vielzeug/scout';

const products = [{ title: 'Widget Pro' }, { title: 'Gadget Plus' }];
const index = createIndex(products, { fields: ['title'] });
const results = products.filter(toFilterPredicate(index, 'widget'));

const top5 = products.filter(toFilterPredicate(index, 'widget', { limit: 5 }));
```

---

## `segmentWords(text)`

Splits `text` into whitespace-joined word segments using the runtime's native `Intl.Segmenter` — no dependency beyond the platform API. Falls back to returning `text` unchanged where `Intl.Segmenter` isn't available.

```ts
function segmentWords(text: string): string
```

`tokenize()`'s trigram-based scoring already works on unsegmented scripts (Chinese, Japanese, Thai, ...) without this — trigrams are generated per-character, not per-word. `segmentWords()` is for `findMatchRanges()` / highlighting and the multi-word query semantics on `SearchConstraints`, which assume space-separated words. **Not applied inside `tokenize()` itself** — benchmarked at ~15x slower than the plain regex path for the common whitespace-delimited case, which would regress `createIndex()`'s construction cost for every caller, not just those indexing unsegmented scripts.

**Example**

```ts
import { createIndex, segmentWords } from '@vielzeug/scout';

const documents = [{ title: '日本語を勉強しています' }];
const index = createIndex(documents, {
  fields: [{ field: 'title', stringify: (value) => segmentWords(String(value)) }],
});
```

---

## `debugSearch(search)` <Badge type="tip" text="@vielzeug/scout/devtools" />

```ts
debugSearch<T>(search: SearchState<T>): () => void
```

Logs `query` → `isSearching` → `results` transitions of a `SearchState` to `console.debug`. Returns a function that unsubscribes all listeners installed by this call. Import from the dedicated sub-path so it's tree-shaken from production bundles.

::: warning Development only
Logs the full, literal search query string — if your queries may carry PII (names, emails, medical/financial terms typed by end users), don't enable this in production.
:::

**Example**

```ts
import { createIndex, createSearch } from '@vielzeug/scout';
import { debugSearch } from '@vielzeug/scout/devtools';

const index = createIndex([{ name: 'Ada Lovelace' }], { fields: ['name'] });
const search = createSearch(index);
const stopDebugging = debugSearch(search);

search.query.value = 'alice';
// [scout:search] query -> "alice"
// [scout:search] isSearching -> true
// [scout:search] isSearching -> false
// [scout:search] results -> 1 item(s)

stopDebugging();
```

---

## Types

### `SearchConstraints`

Shared search-tuning knobs used by `ScoutIndexOptions`, `CreateSearchOptions`, and all search functions.

```ts
type SearchConstraints = {
  limit?: number;           // finite non-negative integer; default 50
  minQueryLength?: number;  // finite positive integer; default 3
  threshold?: number;       // finite 0..1 value; default 0.2
};
```

### `FieldDef<T>`

```ts
type FieldDef<T> =
  | (keyof T & string)
  | {
      field: keyof T & string;
      weight?: number;      // default 1
      stringify?: (value: unknown) => string;
    };
```

### `ScoutIndexOptions<T>`

```ts
type ScoutIndexOptions<T> = SearchConstraints & {
  fields: ReadonlyArray<FieldDef<T>>;
};
```

### `CreateSearchOptions`

```ts
type CreateSearchOptions = SearchConstraints & {
  debounce?: number;   // finite non-negative integer; default 200
};
```

### `SearchResult<T>`

```ts
type SearchResult<T> = {
  item: T;
  matches: FieldMatch<keyof T & string>[];  // literal normalized-token ranges; may be empty for fuzzy-only results
  score: number;                            // [0, 1]; 1 when query is empty
};
```

### `FieldMatch<F>`

Generic over the union of field names — `match.field` is typed to the actual fields of `T`.

```ts
type FieldMatch<F extends string = string> = {
  field: F;
  ranges: [number, number][];  // literal normalized-token [start, end] ranges in original field value
};
```

### `HighlightPart`

```ts
type HighlightPart = {
  highlighted: boolean;
  text: string;
};
```

### `SearchState<T>`

See `createSearch()` above.

### `ReactiveSearch<T>`

```ts
type ReactiveSearch<T> = SearchState<T> & {
  readonly index: ScoutIndex<T>;
};
```

See `createReactiveSearch()` above.

---

## Errors

### `ScoutError`

Base class for all scout errors. Use `instanceof ScoutError` or `ScoutError.is()` to catch any scout-originated error.

```ts
class ScoutError extends Error {
  static is(err: unknown): err is ScoutError;
}
```

**Named subclasses**

| Class               | Thrown when                                                            |
| ------------------- | ---------------------------------------------------------------------- |
| `ScoutConfigurationError` | An index, search, or reactive search receives invalid fields or numeric options |
| `ScoutDisposedError` | A method is called on a disposed `SearchState` instance |

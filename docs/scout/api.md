---
title: Scout — API Reference
description: Complete API reference for @vielzeug/scout — createIndex, createReactiveSearch, createSearch, highlight, highlightField, toSearchFn, toFilterPredicate.
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
| `ScoutIndex.items`        | All indexed items in insertion order                  | Sync           | Returns a new array snapshot each call                        |
| `ScoutIndex.onMutate()`   | Subscribe to `add`/`remove`/`reindex` mutations       | Sync           | Only fires on mutations that actually change the index — not on no-ops |
| `createSearch()`          | Reactive search state backed by a `ScoutIndex`        | Sync           | Requires `@vielzeug/ripple` — dispose when done               |
| `createReactiveSearch()`  | One-call index + reactive search state                | Sync           | Exposes `.index` for incremental mutations                    |
| `findMatchRanges()`       | Compute match ranges for a text + query pair          | Sync           | Returns sorted, non-overlapping `[start, end]` ranges         |
| `highlight()`             | Split text into highlighted/unhighlighted fragments   | Sync           | Ranges must be sorted and non-overlapping                     |
| `highlightField()`        | Highlight a named field from a `SearchResult`         | Sync           | Shorthand for the `matches.find(…).ranges → highlight()` pattern |
| `toSearchFn()`            | Adapt `ScoutIndex` to sourcerer's `searchFn` API      | Sync           | Ignores the `items` arg — index is the source of truth        |
| `toFilterPredicate()`     | Snapshot predicate from a one-time query              | Sync           | Re-call when query or corpus changes                          |
| `segmentWords()`          | Split unsegmented-script text (CJK, Thai, ...) into words | Sync       | Uses native `Intl.Segmenter` — not applied inside `tokenize()` itself (see Pitfalls) |
| `debugSearch()`           | Log a `SearchState`'s query/results transitions       | Sync           | Import from `@vielzeug/scout/devtools`, not the main entry point |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/scout` | All exports — `createIndex`, `createReactiveSearch`, `createSearch`, `findMatchRanges`, `highlight`, `highlightField`, `segmentWords`, `toSearchFn`, `toFilterPredicate`, all types |
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
| `options.threshold` | `number` | Min Dice score for a result (default `0.2`). |
| `options.limit` | `number` | Max results returned by `search()` (default `50`). |
| `options.minQueryLength` | `number` | Min chars before trigram scoring; shorter queries use O(n) containment scan (default `3`). |

**Example**

```ts
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

Subscribes `listener` to run after every `add()` / `remove()` / `reindex()` call that actually changes the index — no-ops (e.g. removing an item that isn't indexed) don't fire it. Returns an unsubscribe function. `createSearch()` uses this internally to keep `results` in sync with index mutations; most callers building on `createIndex()` directly won't need to call it themselves.

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
| `options.debounce` | `number` | ms to wait before committing a query change (default `200`). Pass `0` for immediate updates. |
| `options.limit` | `number` | Override index-level limit. |
| `options.threshold` | `number` | Override index-level threshold. |
| `options.minQueryLength` | `number` | Override index-level minimum query length. |

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
const search = createSearch(index, { debounce: 150 });

effect(() => {
  if (search.isSearching.value) showSpinner();
  else renderList(search.results.value);
});

search.query.value = 'alice';
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
| `options.debounce` | `number` | Debounce ms (default `200`). |
| `options.threshold` | `number` | Min Dice score (default `0.2`). |
| `options.limit` | `number` | Max results (default `50`). |
| `options.minQueryLength` | `number` | Min chars before trigram scoring (default `3`). |

**Returns `ReactiveSearch<T>`** — all `SearchState<T>` members plus:

| Member | Type | Description |
| --- | --- | --- |
| `index` | `ScoutIndex<T>` | The underlying index for `add`, `remove`, `reindex`. |

**Example**

```ts
const search = createReactiveSearch(users, {
  fields: [{ field: 'name', weight: 2 }, 'email'],
  debounce: 150,
});

effect(() => renderList(search.results.value.map(r => r.item)));

// Add a new item at runtime
search.index.add(newUser);

search.dispose();
```

---

## `findMatchRanges(text, query)`

Computes sorted, non-overlapping match ranges for each word in `query` within `text`. Useful when you need to apply highlighting to a different string than the indexed field value (e.g. a truncated preview or a differently formatted display string).

```ts
function findMatchRanges(text: string, query: string): [number, number][]
```

**Example**

```ts
const ranges = findMatchRanges('Alice Johnson', 'alice');
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
for (const result of index.search('alice')) {
  const parts = highlightField(result, 'name', result.item.name);
  console.log(parts.map(p => p.highlighted ? `[${p.text}]` : p.text).join(''));
}
```

When the field has no match (e.g. the query matched via a different field), returns a single unhighlighted part.

---

## `toSearchFn(index, options?)`

Returns a `(items, query) => items` function compatible with `sourcerer`'s `searchFn` option.

```ts
function toSearchFn<T>(index: ScoutIndex<T>, options?: SearchConstraints): (items: readonly T[], query: string) => readonly T[]
```

The `items` argument is ignored — the index is always the source of truth.

```ts
const source = createLocalSource(users, { searchFn: toSearchFn(index) });
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
const results = products.filter(toFilterPredicate(index, 'widget'));

// Cap results via limit
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
const index = createIndex(documents, {
  fields: [{ field: 'title', stringify: (v) => segmentWords(String(v)) }],
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
import { debugSearch } from '@vielzeug/scout/devtools';

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
  limit?: number;           // default 50
  minQueryLength?: number;  // default 3
  threshold?: number;       // default 0.2
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
  debounce?: number;   // default 200
};
```

### `SearchResult<T>`

```ts
type SearchResult<T> = {
  item: T;
  matches: FieldMatch<keyof T & string>[];  // field is narrowed to indexed field names
  score: number;                            // [0, 1]; 1 when query is empty
};
```

### `FieldMatch<F>`

Generic over the union of field names — `match.field` is typed to the actual fields of `T`.

```ts
type FieldMatch<F extends string = string> = {
  field: F;
  ranges: [number, number][];  // [start, end] in original field value
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
| `ScoutDisposedError` | A method is called on a disposed `SearchState` instance               |
| `ScoutIndexError`   | An index is built or queried with an invalid configuration (e.g. zero fields) |

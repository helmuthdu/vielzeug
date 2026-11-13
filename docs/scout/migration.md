---
title: Scout Migration
description: Migrate Scout index configuration and corpus updates to Scout.
---

[[toc]]

## Scout 26.11 Changes

Scout 26.11 fixes the scoring and normalization cores and removes the redundant constructor and observation surface.

### Scores measure query coverage

`search()` scored each field with the overlap coefficient: the fraction of the _smaller_ trigram set found in the larger one. For multi-word queries the field is often the smaller set, so any short field contained in the query scored near `1.0`: the query `tomato soup recipe` returned the field `Tom` at `0.67`.

Scores are now query coverage: `|query ∩ field| / |query|` — what fraction of _what you typed_ was found. The same query scores `Tom` at `0.1` (below the default `0.2` threshold), while clean prefix matches like `fin` → `Finalize Q3 roadmap` keep their high score. Each candidate additionally scores against the union of all its fields' trigrams, weighted by the smallest field weight, so a cross-field query like `alice smith` finds `{ first: 'Alice', last: 'Smith' }` as well as one `Alice Smith` field.

No signature changed, but **score values and result ordering change**; re-tune any hardcoded `threshold` you set against the old formula.

### One normalization for indexing, matching, and highlighting

Indexing, short-query matching, and highlighting previously normalized text three different ways. They now share one normalization: per-code-point lowercasing, punctuation/whitespace runs collapsed to a single space, and Latin-only accent folding (`cafe` finds `Café`; Devanagari, Thai, Arabic, and Hebrew marks are never folded away).

`findMatchRanges()` and `FieldMatch.ranges` output changes:

- Ranges are `[start, end)` positions in the **original** field value, mapped back through the normalization offset map (`İİİstanbul` / `stan` now highlights exactly `stan`, not `nbul`).
- A multi-word query matches as a phrase first, so contiguous phrase hits merge into one range.
- A one-character word only highlights at a word start: initials (`J Smith`) and single-letter codes still light up; `e` no longer matches every `e` in `mercedes`.

Update anything that compared or sliced ranges position-by-position against the old per-word output.

### `createReactiveSearch()` removed

The one-call constructor only forwarded to `createIndex()` + `createSearch()`. Compose the two explicitly:

```ts
// Before
import { createReactiveSearch } from '@vielzeug/scout';

const search = createReactiveSearch(users, { fields: ['name'], debounce: 150 });
search.index.add(newUser);

// After
import { createIndex, createSearch } from '@vielzeug/scout';

const index = createIndex(users, { fields: ['name'] });
const search = createSearch(index, { debounce: 150 });
index.add(newUser); // the search state re-runs the committed query
```

The `ReactiveSearch<T>` type is removed with it; `SearchState<T>` and `ScoutIndex<T>` remain.

### `tap()` and `ScoutEvent` removed

`SearchState.tap()` emitted only `state-change`, duplicating `subscribe()` + `getSnapshot()`. Observe state through the subscription and disposal through the lifecycle members:

```ts
// Before
const stop = search.tap((event) => console.debug(event.snapshot));

// After
const stop = search.subscribe(() => console.debug(search.getSnapshot()));

// Disposal observation (was a { type: 'dispose' } tap event):
search.disposalSignal.addEventListener('abort', cleanup);
```

The `ScoutEvent` type is removed with it.

### `ScoutIndex.onMutate()` renamed to `subscribe()`

Same signature and semantics: subscribe to changed index mutations, receive an unsubscribe function.

```ts
// Before
const unsubscribe = index.onMutate(refresh);

// After
const unsubscribe = index.subscribe(refresh);
```

### Corpus input is `readonly`, records can be keyed (additive)

`createIndex()` and `setItems()` accept `readonly T[]` (source-compatible for all callers). New options/methods for immutable corpora: `ScoutIndexOptions.key` identifies items by a stable key instead of object reference — `setItems()` with fresh-but-equal copies then notifies nothing — and `removeKey(key)` deletes by key without fabricating a `T`. See the Usage Guide's "Immutable data and stable keys".

---

## Scout 26.10 Changes

Scout 26.10 trims the observation surface and aligns error naming with the rest of the monorepo.

### `tap()` no longer emits `dispose`

The `{ type: 'dispose' }` event duplicated `disposed` and `disposalSignal`. `ScoutEvent<T>` is now a single `state-change` shape. Observe disposal through the signal instead:

```ts
// Before
search.tap((event) => {
  if (event.type === 'dispose') cleanup();
});

// After
search.disposalSignal.addEventListener('abort', cleanup);
```

### `ScoutConfigurationError` is renamed

The config error is now `ScoutConfigError`, matching the `<Pkg>ConfigError` name used across the monorepo.

```ts
// Before
import { ScoutConfigurationError } from '@vielzeug/scout';

// After
import { ScoutConfigError } from '@vielzeug/scout';
```

---

## Scout 3 Changes

Scout 3 replaces per-property Ripple signals with one framework-neutral external store. This is a breaking change: use `setQuery()` for writes and read `query`, `isSearching`, and `results` together through `getSnapshot()`.

### Replace signal reads and writes

```ts
// Before
search.query.value = 'alice';
console.log(search.isSearching.value, search.results.value);

// After
search.setQuery('alice');
const { isSearching, results } = search.getSnapshot();
console.log(isSearching, results);
```

### Replace per-property subscriptions

```ts
// Before
const stopResults = search.results.subscribe(render);
const stopSearching = search.isSearching.subscribe(render);

// After
const stop = search.subscribe(() => render(search.getSnapshot()));
```

One subscription now observes an atomic `SearchSnapshot`; subscribers never see `isSearching: false` paired with results from the previous committed query. Subscription errors are reported asynchronously after all subscribers run. Pass `{ signal }` to detach automatically.

### Bridge to Ripple explicitly

```ts
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple();
const state = ripple.fromSubscribable(search, { signal: search.disposalSignal });
const names = ripple.computed(() => state.value.results.map((result) => result.item.name));
```

Scout no longer installs Ripple. Add `@vielzeug/ripple` directly only when your application uses this bridge.

### Observe diagnostics with `tap()`

`tap()` emits typed `state-change` and `dispose` events. Tapper errors are swallowed so diagnostics cannot affect search behavior.

```ts
const stop = search.tap((event) => {
  if (event.type === 'state-change') console.debug(event.snapshot);
});
```

## Scout 2.4 Changes

Scout 2.4 removes the `tap()` observability layer from `SearchState`: it duplicated `@vielzeug/ripple` signal subscriptions that were already available via `search.query.subscribe()`, `search.isSearching.subscribe()`, and `search.results.subscribe()`.

Removed exports:

- `SearchState.tap()` method
- `ScoutEvent` type

### Replace `tap()` with signal subscriptions

```ts
// Before
const stop = search.tap((event) => {
  if (event.type === 'query-change') console.debug('query:', event.query);
  if (event.type === 'results-change') console.debug('results:', event.results.length);
});

// After
const stopQuery = search.query.subscribe(() => console.debug('query:', search.query.peek()));
const stopResults = search.results.subscribe(() => console.debug('results:', search.results.peek().length));
```

### Replace `dispose` event with `disposalSignal`

```ts
// Before
search.tap((event) => {
  if (event.type === 'dispose') cleanup();
});

// After
search.disposalSignal.addEventListener('abort', () => cleanup());
```

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

The internal `_index-state` side-channel is removed. `ScoutIndex` now exposes `revision` as a readonly property: a monotonically increasing counter incremented after every changed mutation. Use it directly when caching search results outside the index.

```ts
// Scout 2: internal side-channel (no public API)
// toSearchMatcher() used a private WeakMap to track index revisions

// Scout 3: public readonly property
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

| Option           | Scout 2 domain              |
| ---------------- | --------------------------- |
| field `weight`   | finite, greater than `0`    |
| `threshold`      | finite, `0..1`              |
| `limit`          | finite non-negative integer |
| `minQueryLength` | finite positive integer     |
| `debounce`       | finite non-negative integer |

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

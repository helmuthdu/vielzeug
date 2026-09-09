---
title: Scout Migration
description: Migrate Scout index configuration and corpus updates to Scout.
---

[[toc]]

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

Scout 2.4 removes the `tap()` observability layer from `SearchState` — it duplicated `@vielzeug/ripple` signal subscriptions that were already available via `search.query.subscribe()`, `search.isSearching.subscribe()`, and `search.results.subscribe()`.

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
search.tap((event) => { if (event.type === 'dispose') cleanup(); });

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

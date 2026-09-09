---
title: Scout — Usage Guide
description: How-to guide for @vielzeug/scout — building indexes, reactive search, highlighting, and integrating with sourcerer and vault.
---

[[toc]]

## Basic Usage

### Building an index

Pass your item array and field configuration to `createIndex`. All items are indexed immediately at construction time.

```ts
import { createIndex } from '@vielzeug/scout';

const users = [
  { email: 'ada@example.com', name: 'Ada Lovelace' },
  { email: 'grace@example.com', name: 'Grace Hopper' },
];

const index = createIndex(users, {
  fields: ['name', 'email'],
});
```

### Searching

Call `index.search(query)` with any string. Results are sorted by score descending.

```ts
const results = index.search('alice');

for (const { item, score, matches } of results) {
  console.log(item.name, score);
}
```

An empty `query` returns all items with `score = 1`:

```ts
index.search(''); // All items, score = 1 each
```

### Per-field weights

Give fields different weights to control score ranking. A match on a high-weight field ranks the item higher than a match on a low-weight field.

```ts
const index = createIndex(users, {
  fields: [
    { field: 'name', weight: 3 }, // name matches rank 3× higher
    { field: 'department', weight: 1 },
    { field: 'bio', weight: 0.5 },
  ],
});
```

### Non-string fields

Use `stringify` to convert numeric or boolean fields to searchable text.

```ts
const index = createIndex(products, {
  fields: [
    'title',
    { field: 'price', stringify: (v) => `$${v}` },
    { field: 'inStock', stringify: (v) => (v ? 'available in stock' : 'out of stock') },
  ],
});
```

### Non-Latin scripts (CJK, Thai, ...)

`tokenize()` indexes any script correctly — trigrams are generated per-character, so Chinese, Japanese, Cyrillic, and accented Latin text are all searchable out of the box. What it doesn't do is insert word boundaries for scripts that don't use spaces (Chinese, Japanese, Thai, ...), which affects `findMatchRanges()` / highlighting and multi-word query semantics. Pre-segment those fields with `segmentWords()`:

```ts
import { createIndex, segmentWords } from '@vielzeug/scout';

const docs = [{ title: '日本語を勉強しています' }, { title: '我喜欢学习中文' }];

const index = createIndex(docs, {
  fields: [{ field: 'title', stringify: (v) => segmentWords(String(v)) }],
});

index.search('日本語'); // matches the first document
```

`segmentWords()` uses the runtime's native `Intl.Segmenter` — no dependency. It's opt-in per field rather than built into `tokenize()` because it benchmarks ~15x slower than the default regex path for ordinary whitespace-delimited text.

### Limiting results

Pass `limit`, `threshold`, and `minQueryLength` in options to control result count and quality. `limit` must be a finite non-negative integer, `threshold` a finite value in `0..1`, and `minQueryLength` a finite positive integer; invalid values throw `ScoutConfigurationError`.

```ts
// At most 10 results, minimum overlap score 0.3
const results = index.search('widget', { limit: 10, threshold: 0.3 });
```

Per-call options override the index-level defaults set in `createIndex`.

Scores come from the overlap (Szymkiewicz–Simpson) coefficient — the fraction of the *shorter*
trigram set (almost always the query) found in the longer one. This is deliberate for the
autocomplete/command-palette use case `createIndex` targets: a short query that's a clean prefix
of a much longer field value (e.g. `'fin'` against `'Finalize Q3 budget report'`) scores on how
much of the query matched, not diluted by how much longer the target field happens to be.

### Controlling short-query behaviour

Queries shorter than `minQueryLength` (default `3`) fall back to an O(n) substring containment scan. Short-query matches return `score = 1.0`.

```ts
// Use trigram scoring even for 1-char queries (good for small corpora)
const index = createIndex(items, { fields: ['name'], minQueryLength: 1 });

// Force containment scan for all queries up to 8 chars (good for autocomplete on large sets)
const results = index.search('alice', { minQueryLength: 8 });
```

## Reactive Search

### `createReactiveSearch()` — recommended

For most use cases, `createReactiveSearch` builds the index and state together. It returns one external store whose snapshot contains `query`, `isSearching`, and `results`, plus `.index` for incremental mutations:

```ts
import { createReactiveSearch } from '@vielzeug/scout';

const search = createReactiveSearch(users, {
  fields: [{ field: 'name', weight: 2 }, 'email'],
  debounce: 150,
});

search.subscribe(() => {
  const { isSearching, results } = search.getSnapshot();
  if (isSearching) showLoadingSpinner();
  else renderResults(results.map((result) => result.item));
});

input.addEventListener('input', (event) => {
  search.setQuery((event.currentTarget as HTMLInputElement).value);
});

search.index.add(newUser);
search.dispose();
```

Each notification observes a complete committed snapshot. During a debounce window, `query` contains the latest input, `isSearching` is `true`, and `results` remain the last committed results.

### `createSearch()` — separate index and state

Use `createSearch` when sharing one index across multiple search stores:

```ts
import { createIndex, createSearch } from '@vielzeug/scout';

const index = createIndex(users, { fields: ['name', 'email'] });
const search = createSearch(index, { debounce: 150 });
```

### `using` declaration

```ts
{
  using search = createReactiveSearch(users, { fields: ['name'] });
  // search.dispose() called automatically at scope exit
}
```

### Zero debounce for synchronous updates

Pass `debounce: 0` for synchronous commits with no searching transition:

```ts
const search = createReactiveSearch(users, { fields: ['name'], debounce: 0 });

search.setQuery('alice');
console.log(search.getSnapshot().results); // Already updated
```

### Resetting search

```ts
search.clear(); // Resets query, results, and isSearching atomically
```

### Composing with Ripple

A complete `SearchState` implements Ripple's structural subscribable contract:

```ts
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple();
const state = ripple.fromSubscribable(search, { signal: search.disposalSignal });
const topResult = ripple.computed(() => state.value.results[0]?.item ?? null);
```

## Incremental Updates

Use `add()`, `remove()`, and `reindex()` for individual reference-based mutations. Use `setItems()` when a refreshed collection replaces the current corpus; Scout reconciles membership, current field values, and source order in one notification.

```ts
const index = createIndex(products, { fields: ['title'] });

// Add a newly created item
const newProduct = { id: 99, title: 'New Widget' };
index.add(newProduct);

// Remove a deleted item (by reference)
index.remove(products[0]);

// Re-index a mutated item after in-place mutation
products[1].title = 'Updated Title';
index.reindex(products[1]);
```

> `remove()`, `reindex()`, and `setItems()` use **reference equality** (`===`). Pass retained object references from the current corpus; `setItems()` collapses duplicate references.

### Replacing a refreshed corpus

```ts
const latestProducts = await loadProducts();

index.setItems(latestProducts);
```

`setItems()` removes references absent from `latestProducts`, adds new references, reindexes retained references, and adopts the incoming order. It calls `onMutate()` once only when index membership, field values, or order changes.

### Inspecting the corpus

Use `.items` to read all currently indexed items in insertion order, or `.size` for a count:

```ts
console.log(index.size);  // 42
console.log(index.items); // [{ id: 1, title: ... }, ...]
```

### Reacting to mutations directly

`createSearch()` already keeps `results` in sync with `add()`/`remove()`/`reindex()`/`setItems()` internally. `toSearchMatcher()` also invalidates its query cache after index mutation. If you're building your own reactivity on top of a plain `ScoutIndex` (no `ripple` involved), subscribe with `onMutate()`:

```ts
const unsubscribe = index.onMutate(() => {
  rerenderResultsList();
});

index.add(newProduct); // triggers rerenderResultsList()

unsubscribe(); // when done
```

`onMutate()` only fires for mutations that actually change the index — a duplicate `add()` or a `remove()` of an unindexed item is a no-op and doesn't notify listeners.

## Match Highlighting

Every `SearchResult` carries `matches` — per-field literal normalized-token ranges. A fuzzy trigram candidate can have `matches: []` when no literal query token appears in its field text.

### `highlightField()` — recommended

`highlightField(result, field, text)` is the shorthand that does the field lookup and fragment split in one step:

```ts
import { highlightField } from '@vielzeug/scout';

for (const result of index.search('alice')) {
  const parts = highlightField(result, 'name', result.item.name);
  // [{ text: 'Alice', highlighted: true }, { text: ' Johnson', highlighted: false }]
  renderHighlightedText(parts);
}
```

::: warning `part.text` is unescaped
`highlight()` / `highlightField()` return the **original, unescaped** field text split into
fragments — never concatenate `part.text` into an HTML string for `innerHTML`. Render each
part as text (`textContent`, a framework's text binding) and wrap `highlighted` parts in your
own element:

```ts
function renderHighlightedText(parts: HighlightPart[]): DocumentFragment {
  const fragment = document.createDocumentFragment();

  for (const part of parts) {
    if (part.highlighted) {
      const mark = document.createElement('mark');

      mark.textContent = part.text; // textContent — never innerHTML
      fragment.appendChild(mark);
    } else {
      fragment.appendChild(document.createTextNode(part.text));
    }
  }

  return fragment;
}
```

:::

### `findMatchRanges()` + `highlight()` — manual

Use `findMatchRanges()` when you need to apply match ranges to a different string than the indexed field value — for example a truncated preview or a differently formatted display string:

```ts
import { findMatchRanges, highlight } from '@vielzeug/scout';

const [result] = index.search('alice');
const preview = result.item.bio.slice(0, 100);
const ranges = findMatchRanges(preview, 'alice');
const parts = highlight(preview, ranges);
```

Or use `highlight()` directly when you already have the ranges from `result.matches`:

```ts
const [result] = index.search('alice');
const nameMatch = result.matches.find(m => m.field === 'name');
const parts = highlight(result.item.name, nameMatch?.ranges ?? []);
```

## Debug Logging

Use `tap()` for typed runtime observation without affecting search behavior:

```ts
import { createIndex, createSearch } from '@vielzeug/scout';

const search = createSearch(index, { debounce: 150 });
const stop = search.tap((event) => {
  if (event.type === 'state-change') {
    console.debug(event.snapshot.query, event.snapshot.isSearching, event.snapshot.results.length);
  } else {
    console.debug('disposed');
  }
});

search.setQuery('alice');
stop();
```

Tapper errors are swallowed. Use `subscribe()` instead when application state must update after each snapshot commit.

::: warning Development logging
`query` carries the full, literal search query string — if your queries may carry PII (names, emails, medical/financial terms typed by end users), don't log them in production.
:::

## Framework Integration

::: code-group

```tsx [React]
import { createReactiveSearch } from '@vielzeug/scout';
import { useEffect, useMemo, useSyncExternalStore } from 'react';

type User = { id: number; name: string; email: string };

function useScoutSearch(items: User[]) {
  const search = useMemo(
    () => createReactiveSearch(items, {
      fields: [{ field: 'name', weight: 2 }, 'email'],
      debounce: 150,
    }),
    [items],
  );
  const snapshot = useSyncExternalStore(search.subscribe, search.getSnapshot, search.getSnapshot);

  useEffect(() => () => search.dispose(), [search]);

  return { ...snapshot, setQuery: search.setQuery };
}
```

```ts [Vue 3]
import { createReactiveSearch } from '@vielzeug/scout';
import { onScopeDispose, shallowRef } from 'vue';

type User = { id: number; name: string; email: string };

function useScoutSearch(items: User[]) {
  const search = createReactiveSearch(items, {
    fields: [{ field: 'name', weight: 2 }, 'email'],
    debounce: 150,
  });
  const snapshot = shallowRef(search.getSnapshot());
  const stop = search.subscribe(() => { snapshot.value = search.getSnapshot(); });

  onScopeDispose(() => { stop(); search.dispose(); });

  return { search, snapshot };
}
```

```svelte [Svelte]
<script lang="ts">
  import { createReactiveSearch } from '@vielzeug/scout';
  import { onDestroy } from 'svelte';

  type User = { id: number; name: string; email: string };

  export let items: User[];

  const search = createReactiveSearch(items, {
    fields: [{ field: 'name', weight: 2 }, 'email'],
    debounce: 150,
  });
  let snapshot = search.getSnapshot();
  const stop = search.subscribe(() => { snapshot = search.getSnapshot(); });

  onDestroy(() => { stop(); search.dispose(); });
</script>

<input value={snapshot.query} on:input={(event) => search.setQuery(event.currentTarget.value)} placeholder="Search…" />
{#each snapshot.results as { item }}
  <p>{item.name}</p>
{/each}
```

:::

## Working with Other Vielzeug Libraries

### With Sourcerer

`toSearchMatcher()` adapts a `ScoutIndex` into Sourcerer's local-source filter.

```ts
import { createIndex, toSearchMatcher } from '@vielzeug/scout';
import { createLocalSource } from '@vielzeug/sourcerer';

const index = createIndex(users, {
  fields: [{ field: 'name', weight: 2 }, 'email'],
});
const source = createLocalSource(users, { filter: toSearchMatcher(index), params: '' });

source.setParams('alice');
console.log(source.state.items);
```

> Update the index and source from the same collection change. Use `index.setItems(items)` with `source.setItems(items)` for replacement collections.

### With Vault

`toFilterPredicate()` returns an `(item: T) => boolean` snapshot predicate — pass it to vault's `query.filter()` or plain `Array.filter`.

```ts
import { createIndex, toFilterPredicate } from '@vielzeug/scout';

const index = createIndex(products, { fields: ['title', 'sku'] });

const matching = products.filter(toFilterPredicate(index, 'widget'));

const rows = await db.query('products')
  .filter(toFilterPredicate(index, searchTerm))
  .toArray();
```

Call `toFilterPredicate` again whenever the query or corpus changes — the predicate is a snapshot, not reactive.

## Best Practices

- **Build the index once** — `createIndex()` runs in O(corpus × field_length). Create it at module level or in an effect, not inside render loops.
- **Keep the index in sync** — call `index.add()` / `remove()` / `reindex()` when items mutate. Stale index entries return wrong scores.
- **Tune threshold before limit** — set a meaningful `threshold` (e.g. `0.25–0.4`) to suppress noise, then use `limit` to cap the list length.
- **Set `minQueryLength` for your corpus size** — the default `3` works well for most cases. Lower it for small corpora where single-char queries are expected; raise it for large corpora to avoid expensive O(n) scans.
- **Dispose reactive state** — always call `search.dispose()` or use `using` when the component unmounts.
- **Weight by importance** — name/title fields should have weight `2–3`; secondary fields (description, tags) stay at `1`.
- **Segment CJK/Thai fields explicitly** — `segmentWords()` is opt-in per field, not automatic, to keep `createIndex()` fast for the common whitespace-delimited case.

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

Pass `limit`, `threshold`, and `minQueryLength` in options to control result count and quality.

```ts
// At most 10 results, minimum Dice score 0.3
const results = index.search('widget', { limit: 10, threshold: 0.3 });
```

Per-call options override the index-level defaults set in `createIndex`.

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

For most use cases, `createReactiveSearch` builds the index and reactive state together in one call. It returns a `ReactiveSearch<T>` — a `SearchState<T>` with an extra `.index` property for incremental mutations:

```ts
import { createReactiveSearch } from '@vielzeug/scout';
import { effect } from '@vielzeug/ripple';

const search = createReactiveSearch(users, {
  fields: [{ field: 'name', weight: 2 }, 'email'],
  debounce: 150,
});

effect(() => {
  if (search.isSearching.value) showLoadingSpinner();
  else renderResults(search.results.value.map(r => r.item));
});

input.addEventListener('input', e => {
  search.query.value = e.currentTarget.value;
});

// Add items at runtime via the exposed index
search.index.add(newUser);

onUnmount(() => search.dispose());
```

### `createSearch()` — separate index and state

Use `createSearch` when you need to create the index independently — for example when sharing it across multiple reactive states:

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

Pass `debounce: 0` if you want results updated synchronously (no `isSearching` flash).

```ts
const search = createReactiveSearch(users, { fields: ['name'], debounce: 0 });

search.query.value = 'alice';
console.log(search.results.value); // Already updated
```

### Resetting search

```ts
search.clear(); // Resets query + results + isSearching synchronously
```

### Composing with ripple signals

`search.results` is a `Computed` signal — compose it into other computed values:

```ts
import { computed } from '@vielzeug/ripple';

const topResult = computed(() => search.results.value[0]?.item ?? null);
```

## Incremental Updates

`add()`, `remove()`, and `reindex()` patch the inverted index in O(field_length) — no full rebuild needed.

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

> `remove()` and `reindex()` use **reference equality** (`===`). Pass the same object reference that was originally added.

### Inspecting the corpus

Use `.items` to read all currently indexed items in insertion order, or `.size` for a count:

```ts
console.log(index.size);  // 42
console.log(index.items); // [{ id: 1, title: ... }, ...]
```

### Reacting to mutations directly

`createSearch()` already keeps `results` in sync with `add()`/`remove()`/`reindex()` internally. If you're building your own reactivity on top of a plain `ScoutIndex` (no `ripple` involved), subscribe with `onMutate()`:

```ts
const unsubscribe = index.onMutate(() => {
  rerenderResultsList();
});

index.add(newProduct); // triggers rerenderResultsList()

unsubscribe(); // when done
```

`onMutate()` only fires for mutations that actually change the index — a duplicate `add()` or a `remove()` of an unindexed item is a no-op and doesn't notify listeners.

## Match Highlighting

Every `SearchResult` carries `matches` — per-field character ranges where the query was found.

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

Import `debugSearch` from the dedicated `/devtools` sub-path to log a `SearchState`'s `query` → `isSearching` → `results` transitions to `console.debug`. The sub-path is tree-shaken from production bundles when not imported.

::: warning Development only
`debugSearch()` logs the full, literal search query string — if your queries may carry PII (names, emails, medical/financial terms typed by end users), don't enable this in production.
:::

```ts
import { debugSearch } from '@vielzeug/scout/devtools';

const search = createSearch(index, { debounce: 150 });
const stopDebugging = debugSearch(search);

search.query.value = 'alice';
// [scout:search] query -> "alice"
// [scout:search] isSearching -> true
// [scout:search] isSearching -> false
// [scout:search] results -> 1 item(s)

stopDebugging();
```

## Framework Integration

::: code-group

```tsx [React]
import { createReactiveSearch } from '@vielzeug/scout';
import { useEffect, useRef, useSyncExternalStore } from 'react';

type User = { id: number; name: string; email: string };

function useScoutSearch(items: User[]) {
  const ref = useRef(
    createReactiveSearch(items, {
      fields: [{ field: 'name', weight: 2 }, 'email'],
      debounce: 150,
    }),
  );

  const search = ref.current;

  const results = useSyncExternalStore(
    (cb) => search.results.subscribe(cb),
    () => search.results.value,
  );

  useEffect(() => () => search.dispose(), [search]);

  return { query: search.query, results };
}
```

```ts [Vue 3]
import { createReactiveSearch } from '@vielzeug/scout';
import { onScopeDispose, ref, watch } from 'vue';

type User = { id: number; name: string; email: string };

function useScoutSearch(items: User[]) {
  const search = createReactiveSearch(items, {
    fields: [{ field: 'name', weight: 2 }, 'email'],
    debounce: 150,
  });

  const query = ref('');
  const results = ref(search.results.value);

  const unsub = search.results.subscribe(() => {
    results.value = search.results.value;
  });

  watch(query, (q) => { search.query.value = q; });

  onScopeDispose(() => { unsub(); search.dispose(); });

  return { query, results };
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

  let query = '';
  let results = search.results.value;

  const unsub = search.results.subscribe(() => {
    results = search.results.value;
  });

  $: search.query.value = query;

  onDestroy(() => { unsub(); search.dispose(); });
</script>

<input bind:value={query} placeholder="Search…" />
{#each results as { item }}
  <p>{item.name}</p>
{/each}
```

:::

## Working with Other Vielzeug Libraries

### With Sourcerer

`toSearchFn()` adapts a `ScoutIndex` to the `searchFn` slot in sourcerer's `createLocalSource` — Scout handles fuzzy matching, sourcerer handles pagination and filtering.

```ts
import { createIndex, toSearchFn } from '@vielzeug/scout';
import { createLocalSource } from '@vielzeug/sourcerer';

const index = createIndex(users, {
  fields: [{ field: 'name', weight: 2 }, 'email'],
});

const source = createLocalSource(users, {
  searchFn: toSearchFn(index),
});

source.patch({ search: 'alice' });
```

> The `items` argument received by `searchFn` is ignored — the index is the source of truth. Keep the index in sync using `index.add()` / `index.remove()` / `index.reindex()`.

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

# @vielzeug/scout

Fast fuzzy-search. Builds a trigram inverted index at construction — O(candidates) per query instead of O(corpus × field_length).

## Features

- **Trigram index** — fast candidate lookup; Dice coefficient scoring
- **Multi-field weighted ranking** — per-field weights, custom stringifiers
- **Match highlighting** — character-range offsets for UI rendering
- **Reactive layer** — `createSearch()` wraps any index in `ripple` signals with debounce
- **Framework adapters** — `toSearchFn()` for sourcerer, `toFilterPredicate()` for filter pipelines
- **Incremental updates** — `add()`, `remove()`, `update()` patch the index in O(field_length)

## Install

```sh
pnpm add @vielzeug/scout
```

## Quick start

```ts
import { createIndex } from '@vielzeug/scout';

const index = createIndex(users, {
  fields: [
    { field: 'name', weight: 2 },
    { field: 'email' },
  ],
});

const results = index.search('alice');
// [{ item: { name: 'Alice', email: '...' }, score: 0.85, matches: [...] }]
```

## Reactive search

```ts
import { createIndex, createSearch } from '@vielzeug/scout';
import { effect } from '@vielzeug/ripple';

const index = createIndex(users, { fields: ['name'] });
const search = createSearch(index, { debounce: 150 });

effect(() => {
  console.log(search.results.value);
});

search.query.value = 'alice';
```

## Sourcerer integration

```ts
import { createIndex, toSearchFn } from '@vielzeug/scout';

const index = createIndex(users, { fields: ['name', 'email'] });
const source = createLocalSource(users, { searchFn: toSearchFn(index) });
```

## Highlighting

```ts
import { highlight } from '@vielzeug/scout';

const parts = highlight('Hello World', [[0, 5]]);
// [{ text: 'Hello', highlighted: true }, { text: ' World', highlighted: false }]
```

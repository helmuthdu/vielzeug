# @vielzeug/scout

Fast fuzzy-search. Builds a trigram inverted index at construction — O(candidates) per query instead of O(corpus × field_length).

## Features

- **Trigram index** — fast candidate lookup; overlap-coefficient scoring
- **Multi-field weighted ranking** — per-field weights, custom stringifiers
- **Match highlighting** — character-range offsets for UI rendering
- **Reactive layer** — `createSearch()` wraps any index in `ripple` signals with debounce
- **Framework adapters** — `toSearchMatcher()` for sourcerer, `toFilterPredicate()` for filter pipelines
- **Corpus reconciliation** — `setItems()` reconciles reference-based additions, removals, reindexes, and order in one notification
- **Unsegmented-script helper** — `segmentWords()` pre-splits CJK/Thai text into words via `Intl.Segmenter`
- **Devtools** — `@vielzeug/scout/devtools`'s `debugSearch()` logs query/results transitions

## Install

```sh
pnpm add @vielzeug/scout
```

## Quick start

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

console.log(index.search('ada')[0]?.item.name); // Ada Lovelace
```

## Reactive search

```ts
import { createIndex, createSearch } from '@vielzeug/scout';
import { effect } from '@vielzeug/ripple';

const users = [{ name: 'Ada Lovelace' }, { name: 'Grace Hopper' }];
const index = createIndex(users, { fields: ['name'] });
const search = createSearch(index, { debounce: 150 });

effect(() => {
  console.log(search.results.value);
});

search.query.value = 'alice';
```

## Sourcerer integration

```ts
import { createIndex, toSearchMatcher } from '@vielzeug/scout';
import { createLocalSource } from '@vielzeug/sourcerer';

const users = [{ email: 'ada@example.com', name: 'Ada Lovelace' }];
const index = createIndex(users, { fields: ['name', 'email'] });
const source = createLocalSource(users, { match: toSearchMatcher(index) });
```

## Highlighting

```ts
import { highlight } from '@vielzeug/scout';

const parts = highlight('Hello World', [[0, 5]]);
// [{ text: 'Hello', highlighted: true }, { text: ' World', highlighted: false }]
```

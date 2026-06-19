---
title: 'Flux Examples — Combining Streams with combineLatest'
description: 'Combining streams example for @vielzeug/flux.'
---

## Combining Streams with combineLatest

### Problem

A UI element depends on two independent data sources — for example, a filter panel and a paginated list. You need to re-render whenever either changes, using the latest value from both.

### Solution

Use `combineLatest()` to emit a tuple whenever any source emits, provided all sources have emitted at least once. Pair with `map()` to derive the final state.

```ts
import { createSubject, combineLatest, map } from '@vielzeug/flux';

type Filter = { category: string };
type Page = { page: number; size: number };
type ListState = { filter: Filter; page: Page };

const filter$ = createSubject<Filter>();
const page$ = createSubject<Page>();

const listState$ = combineLatest(filter$, page$).pipe(
  map(([filter, page]): ListState => ({ filter, page })),
);

listState$.subscribe(({ filter, page }) => {
  console.log(`Fetching page ${page.page} with category=${filter.category}`);
});

filter$.emit({ category: 'books' });
page$.emit({ page: 1, size: 20 });
// → Fetching page 1 with category=books

page$.emit({ page: 2, size: 20 });
// → Fetching page 2 with category=books
```

#### Only re-fetch when the source changes — not on every render

Use `distinctUntilChanged()` with a shallow comparator to skip redundant fetches:

```ts
import { distinctUntilChanged } from '@vielzeug/flux';

const stableState$ = listState$.pipe(
  distinctUntilChanged(
    (a, b) => a.filter.category === b.filter.category && a.page.page === b.page.page,
  ),
);
```

#### Sampling — take the latest filter only when the page changes

If the filter changes constantly (e.g., a range slider) but you only want to act when the page commits:

```ts
import { sample, withLatestFrom } from '@vielzeug/flux';

// Emit [page, filter] only when page$ emits
page$.pipe(withLatestFrom(filter$)).subscribe(([page, filter]) => {
  console.log(`Commit: page=${page.page}, category=${filter.category}`);
});
```

### Pitfalls

- `combineLatest` does not emit until **all** sources have emitted at least once — seed subjects with an initial value or use `startWith()` if you need an immediate emission.
- For fire-and-forget coordination (wait for all to complete, emit last values) use `forkJoin()` instead.
- `withLatestFrom` does not subscribe to the `other` stream; it only reads its latest buffered value. If `other` has never emitted, the emission is silently dropped.

### Related

- [Debounced Search Input](./debounce-search.md)
- [API: `combineLatest()`](../api.md#combinelatest)
- [API: `withLatestFrom()`](../api.md#withlatestfrom)

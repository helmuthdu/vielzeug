---
title: 'Flux Examples — Combining Streams with combineLatest'
description: 'Combine latest filter and page values from explicit channel streams.'
---

## Combining Streams

### Problem

A request depends on filter and page state. You need a new request whenever either state changes, with latest values from both.

### Solution

Seed channels with initial state, combine them, then map tuple to request state.

```ts
import { combineLatest, map, pipe } from '@vielzeug/flux';
import { createChannel } from '@vielzeug/flux/subjects';

type Filter = { category: string };
type Page = { page: number; size: number };

const filter = createChannel<Filter>({ initial: { category: 'all' } });
const page = createChannel<Page>({ initial: { page: 1, size: 20 } });

const state = pipe(
  combineLatest(filter.stream, page.stream),
  map(([activeFilter, activePage]) => ({ activeFilter, activePage })),
);

state.subscribe({ error: console.error, next: console.log });
filter.send({ category: 'books' });
page.send({ page: 2, size: 20 });

filter.dispose();
page.dispose();
```

### Pitfalls

- `combineLatest()` emits only after every source emitted at least once.
- It completes without emission when a source completes before its first value.
- Keep `send()` private to state owners; share `channel.stream` with consumers.

### Related

- [Debounced Search Input](./debounce-search.md)
- [Signal Integration](./signal-integration.md)
- [API: `combineLatest()`](../api.md#combinelatest)

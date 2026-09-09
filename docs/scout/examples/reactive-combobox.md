---
title: 'Scout Examples — Reactive Combobox'
description: 'Wire an atomic createSearch store to a combobox input with debounce and isSearching state.'
---

## Reactive Combobox

### Problem

A live search input needs to show a loading state while the user types, debounce repeated keystrokes, and re-render only when results actually change. Wiring this by hand means manually tracking timers and discarding stale in-flight results.

### Solution

`createSearch()` wraps a `ScoutIndex` in a zero-dependency external store with debounce built in. Call `setQuery()`, then render the complete state returned by `getSnapshot()`.

```ts
import { createIndex, createSearch, highlight } from '@vielzeug/scout';

type Option = { id: number; label: string; category: string };

const options: Option[] = [
  { id: 1, label: 'Apple', category: 'fruit' },
  { id: 2, label: 'Apricot', category: 'fruit' },
  { id: 3, label: 'Broccoli', category: 'vegetable' },
  { id: 4, label: 'Banana', category: 'fruit' },
  { id: 5, label: 'Blueberry', category: 'fruit' },
  { id: 6, label: 'Brussels Sprouts', category: 'vegetable' },
];

const index = createIndex(options, {
  fields: [{ field: 'label', weight: 2 }, { field: 'category' }],
});

// Create reactive search state — results update 150ms after query changes
const search = createSearch(index, { debounce: 150, limit: 5 });

const render = () => {
  const { isSearching, results } = search.getSnapshot();
  if (isSearching) return console.log('⏳ Searching…');
  if (!results.length) return console.log('No results');

  for (const { item, matches } of results) {
    const labelMatch = matches.find(m => m.field === 'label');
    const parts = highlight(item.label, labelMatch?.ranges ?? []);
    console.log(parts.map(p => p.highlighted ? `[${p.text}]` : p.text).join(''), `(${item.category})`);
  }
};

search.subscribe(render);

// Simulate user typing (in a real app, wire to input.addEventListener('input', ...))
search.setQuery('br'); // triggers debounce
// …150ms later…
// [Br]occoli (vegetable)
// [Br]ussels Sprouts (vegetable)

search.setQuery('bru'); // cancels previous debounce, starts new one
// …150ms later…
// [Bru]ssels Sprouts (vegetable)

// Reset the search
search.clear();

// Cleanup
search.dispose();

// Or use the `using` declaration for automatic disposal
{
  using s = createSearch(index);
  s.setQuery('apple');
  // s.dispose() called automatically at block exit
}
```

#### With state observation (optional)

```ts
const stop = search.subscribe(() => {
  const snapshot = search.getSnapshot();
  console.debug(snapshot.query, snapshot.isSearching, snapshot.results.length);
});

search.setQuery('br');
// br true 6
// br false 2

stop();
```

::: warning PII
`query` carries the literal search query string — avoid logging it in production if queries may contain PII.
:::

### Pitfalls

- Always call `search.dispose()` (or use `using`) — an undisposed `SearchState` retains its index subscription and any pending debounce timer.
- `debounce: 0` skips the `isSearching` flash entirely — don't rely on it for a loading indicator when using synchronous updates.
- `search.clear()` throws `ScoutDisposedError` if called after `dispose()` — don't call lifecycle methods after teardown.
- `index.add()` / `.remove()` / `.reindex()` / `.setItems()` update the snapshot even without a query change — no need to call `setQuery()` again.

### Related

- [Basic Search](./basic-search.md)
- [Sourcerer Integration](./sourcerer-integration.md)

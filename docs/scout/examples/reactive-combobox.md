---
title: 'Scout Examples — Reactive Combobox'
description: 'Wire createSearch signals to a combobox input with debounce and isSearching state.'
---

## Reactive Combobox

### Problem

A live search input needs to show a loading state while the user types, debounce repeated keystrokes, and re-render only when results actually change. Wiring this by hand means manually tracking timers and discarding stale in-flight results.

### Solution

`createSearch()` wraps a `ScoutIndex` in `@vielzeug/ripple` signals with debounce built in. Set `search.query.value` and read `search.results` / `search.isSearching` reactively.

```ts
import { createIndex, createSearch, highlight } from '@vielzeug/scout';
import { effect } from '@vielzeug/ripple';

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

// Reactive rendering
effect(() => {
  if (search.isSearching.value) {
    console.log('⏳ Searching…');
    return;
  }

  const results = search.results.value;

  if (!results.length) {
    console.log('No results');
    return;
  }

  for (const { item, matches } of results) {
    const labelMatch = matches.find(m => m.field === 'label');
    const parts = highlight(item.label, labelMatch?.ranges ?? []);
    const display = parts.map(p => p.highlighted ? `[${p.text}]` : p.text).join('');

    console.log(`${display} (${item.category})`);
  }
});

// Simulate user typing (in a real app, wire to input.addEventListener('input', ...))
search.query.value = 'br'; // triggers debounce
// …150ms later…
// [Br]occoli (vegetable)
// [Br]ussels Sprouts (vegetable)

search.query.value = 'bru'; // cancels previous debounce, starts new one
// …150ms later…
// [Bru]ssels Sprouts (vegetable)

// Reset the search
search.clear();

// Cleanup
search.dispose();

// Or use the `using` declaration for automatic disposal
{
  using s = createSearch(index);
  s.query.value = 'apple';
  // s.dispose() called automatically at block exit
}
```

#### With debug logging (optional)

```ts
import { debugSearch } from '@vielzeug/scout/devtools';

const stopDebugging = debugSearch(search);

search.query.value = 'br';
// [scout:search] query -> "br"
// [scout:search] isSearching -> true
// [scout:search] isSearching -> false
// [scout:search] results -> 2 item(s)

stopDebugging();
```

::: warning Development only
`debugSearch()` logs the literal search query via `console.debug` — avoid enabling it in production if queries may contain PII.
:::

### Pitfalls

- Always call `search.dispose()` (or use `using`) — an undisposed `SearchState` leaks its `ripple` subscriptions and any pending debounce timer.
- `debounce: 0` skips the `isSearching` flash entirely — don't rely on it for a loading indicator when using synchronous updates.
- `search.clear()` throws `ScoutDisposedError` if called after `dispose()` — don't call lifecycle methods after teardown.
- `search.index.add()` / `.remove()` / `.reindex()` update `results` even without a query change — no need to also bump `search.query` to force a refresh.

### Related

- [Basic Search](./basic-search.md)
- [Sourcerer Integration](./sourcerer-integration.md)

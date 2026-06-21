---
title: Scout — Reactive Combobox
description: Wire createSearch signals to a combobox input with debounce and isSearching state.
---

# Reactive Combobox

`createSearch()` wraps a `ScoutIndex` in `@vielzeug/ripple` signals with optional debounce — ideal for live search inputs.

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

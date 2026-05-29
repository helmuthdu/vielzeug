---
title: 'Craft Examples — Search List with Directives'
description: 'Search List with Directives example for @vielzeug/craft.'
---

## Search List with Directives

### Problem

You have a list that should filter as the user types into an input — binding the input value to a signal and conditionally rendering list items based on that signal.

### Solution

Use `each()` with positional arguments and `when()` for the empty-state fallback.

```ts
import { computed, define, each, html, signal, when } from '@vielzeug/craft';

define('search-list', {
  setup() {
    const query = signal('');
    const items = signal(['Alice', 'Bob', 'Carol', 'Dave']);
    const filtered = computed(() =>
      items.value.filter((name) => name.toLowerCase().includes(query.value.toLowerCase())),
    );

    return html`
      <input :value=${query} @input=${(e: Event) => (query.value = (e.target as HTMLInputElement).value)} />

      ${when(
        () => filtered.value.length > 0,
        () => html`<ul>
          ${each(
            filtered,
            (_, i) => i,
            (name) => html`<li>${name}</li>`,
          )}
        </ul>`,
        () => html`<p>No matches</p>`,
      )}
    `;
  },
});
```

### Pitfalls

- `each()` takes positional arguments `(source, key, render, fallback?)` — not an options object `{ key, render }`. Passing an object will fail silently.
- Mutating an array in place (`list.push(item)`) does not trigger re-render. Assign a new array reference: `items.value = [...items.value, item]`.
- Using array index as the key (`(_, i) => i`) works for static lists but causes DOM reuse bugs when items are reordered or removed. Prefer stable IDs.

### Related

- [Scroll — Virtual lists](/scroll/) for rendering large filtered datasets efficiently
- [Ripple — Computed signals](/ripple/) for the `computed()` used to derive the filtered list
- [Counter Component](./counter-component.md)

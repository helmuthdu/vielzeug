---
title: 'Craft Examples — Search List with Directives'
description: 'Search List with Directives examples for craft.'
---

## Search List with Directives

### Problem

You have a list that should filter as the user types into an input — binding the input value to a signal and conditionally rendering list items based on that signal.

### Solution

```ts
import { computed, define, each, html, signal } from '@vielzeug/craft';

define('search-list', {
  setup() {
    const query = signal('');
    const items = signal(['Alice', 'Bob', 'Carol', 'Dave']);
    const filtered = computed(() =>
      items.value.filter((name) => name.toLowerCase().includes(query.value.toLowerCase())),
    );

    return () => html`
      <input :value=${query} @input=${(e: Event) => (query.value = (e.target as HTMLInputElement).value)} />

      ${() =>
        filtered.value.length > 0
          ? html`<ul>
              ${each(filtered, {
                key: (_, i) => i,
                render: (name) => html`<li>${name}</li>`,
              })}
            </ul>`
          : html`<p>No matches</p>`}
    `;
  },
});
```


### Pitfalls

- Directives re-run when the bound signal changes, not when an array is mutated in place. Calling `list.push(item)` without assigning a new array reference will not trigger a re-render.
- An empty string is falsy in a conditional directive — `if=""` may hide items unexpectedly. Always coerce to boolean before binding.
- Attaching an `@input` directive to a non-input element (e.g. a `<div>`) will never fire. Use `@change` or the correct event name for the target element type.

### Related
- [Signals (Ripple)](@vielzeug/ripple/examples/signals)
- [Virtual List (Scroll)](@vielzeug/scroll/examples/basic-fixed-height-list)

- [Context Provider and Consumer](./context-provider-and-consumer.md)
- [Counter Component](./counter-component.md)
- [Form-Associated Rating Input](./form-associated-rating-input.md)

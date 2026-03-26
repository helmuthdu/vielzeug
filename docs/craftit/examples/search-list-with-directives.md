---
title: 'Craftit Examples — Search List with Directives'
description: 'Search List with Directives examples for craftit.'
---

## Search List with Directives

## Problem

Implement search list with directives in a production-friendly way with `@vielzeug/craftit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/craftit` installed.

```ts
import { component, computed, define, html, signal } from '@vielzeug/craftit';
import { each, when } from '@vielzeug/craftit/directives';

define(
  'search-list',
  component({
    setup() {
      const query = signal('');
      const items = signal(['Alice', 'Bob', 'Carol', 'Dave']);
      const filtered = computed(() => items.value.filter((name) => name.toLowerCase().includes(query.value.toLowerCase())));

      return html`
        <input :value=${query} @input=${(e: Event) => (query.value = (e.target as HTMLInputElement).value)} />

        ${when({
          condition: () => filtered.value.length > 0,
          then: () =>
            html`<ul>
              ${each(filtered, {
                key: (_, i) => i,
                render: (name) => html`<li>${name}</li>`,
              })}
            </ul>`,
          else: () => html`<p>No matches</p>`,
        })}
      `;
    },
  }),
);
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Context Provider and Consumer](./context-provider-and-consumer.md)
- [Counter Component](./counter-component.md)
- [Form-Associated Rating Input](./form-associated-rating-input.md)

---
title: 'Assay Examples — Custom Element Interaction'
description: 'Custom Element Interaction example for @vielzeug/assay.'
---

## Custom Element Interaction

### Problem

You've written a vanilla custom element and want to assert on its behavior — click a button inside its DOM, then check that the visible state updated — without a framework-specific test renderer.

### Solution

Use `within()` to scope queries to the element and `fireClick()` to dispatch the interaction.

```ts
import { fireClick, within } from '@vielzeug/assay';

customElements.define(
  'like-button',
  class extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `<button>Like</button> <span class="count">0</span>`;
      this.querySelector('button')!.addEventListener('click', () => {
        const span = this.querySelector('.count')!;

        span.textContent = String(Number(span.textContent) + 1);
      });
    }
  },
);

const el = document.createElement('like-button');

document.body.appendChild(el);

const view = within(el);

fireClick(view.get('button'));

console.log(view.get('.count').textContent); // '1'

el.remove();
```

### Pitfalls

- `within(el)` queries `el`'s light DOM — if your element renders into a shadow root, scope to `el.shadowRoot` instead.
- Remove the element (`el.remove()`) when you're done — Assay has no auto-cleanup registry.
- `fireClick()` is synchronous; if the handler triggers an async update, await `waitUntil(...)` afterward.

### Related

- [Waiting for Async Updates](./waiting-for-async-updates.md)
- [Ore Usage Guide — Testing Utilities](/ore/usage#testing-utilities)

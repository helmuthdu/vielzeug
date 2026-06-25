---
title: Refine — Usage Guide
description: Installation, attributes, events, slots, and ecosystem integration for Refine components.
---

# Usage Guide

[[toc]]

Refine components are native Web Components. Once imported, they behave like regular HTML elements — set attributes, listen to DOM events, use slots for content projection.

## Installation

Import the global styles first, then register only the components you need:

```ts
import '@vielzeug/refine/styles';
import '@vielzeug/refine/button';
import '@vielzeug/refine/input';
import '@vielzeug/refine/dialog';
```

The styles import loads design tokens and base styles. Components still render without it, but they will miss tokens and visual polish. Always import it first.

To register every component at once (larger bundle):

```ts
import '@vielzeug/refine/styles';
import '@vielzeug/refine';
```

## Attributes and Events

Set attributes directly on the element. Attributes map to component props:

```html
<ore-button variant="outline" color="secondary" size="lg" disabled>
  Large Outline Button
</ore-button>
```

Components emit standard DOM events. Common event names: `click`, `input`, `change`, `open`, `close`, `select`. Custom events carry a `detail` object:

```javascript
const input = document.querySelector('ore-input');

input.addEventListener('change', (event) => {
  console.log(event.detail.value);
});
```

Native browser events (`click`, `focus`, `blur`) work as normal. Custom events with `event.detail` require `addEventListener` in React 18 and earlier — see the [Framework Integration](./frameworks.md) guide.

## Slots

Slots let you pass HTML into named regions of a component without JavaScript.

Content placed directly inside the element fills the default slot:

```html
<ore-button>Save Changes</ore-button>
<ore-card>Any HTML content here</ore-card>
```

Components with distinct regions expose named slots:

```html
<ore-card>
  <span slot="header">Card Heading</span>
  <p>Main body content fills the default slot.</p>
  <div slot="footer">
    <ore-button size="sm" variant="outline">Cancel</ore-button>
    <ore-button size="sm">Confirm</ore-button>
  </div>
</ore-card>
```

Many input components expose `prefix` and `suffix` slots for icons or actions:

```html
<ore-button>
  <ore-icon slot="prefix" name="arrow-left" size="18"></ore-icon>
  Back
</ore-button>

<ore-input label="Search">
  <ore-icon slot="suffix" name="search" size="18" aria-hidden="true"></ore-icon>
</ore-input>
```

Each component's available slots are listed in its API Reference table.

## Composing with Ore and Ripple

Refine components are plain HTML elements — they compose naturally with [Ore](/ore/) custom elements and [Ripple](/ripple/) signals.

**Build a custom component that wraps Refine elements:**

```ts
import '@vielzeug/refine/button';
import '@vielzeug/refine/input';
import { define, html } from '@vielzeug/ore';
import { signal } from '@vielzeug/ripple';

define('my-search-bar', () => {
  const query = signal('');
  return html`
    <ore-input
      .value=${query}
      @input=${(e) => (query.value = e.detail.value)}
      label="Search"
    />
    <ore-button @click=${() => search(query.value)} variant="solid" color="primary">
      Search
    </ore-button>
  `;
});
```

**Drive component state from reactive signals:**

```ts
import { signal, effect } from '@vielzeug/ripple';

const isLoading = signal(false);
const btn = document.querySelector('ore-button');

effect(() => {
  btn.loading = isLoading.value;
});
```

## Framework Integration

For React, Vue, Svelte, and Angular wiring — including event handling, TypeScript declarations, Vite setup, and SSR guards — see the [Framework Integration](./frameworks.md) guide.

## Accessibility

All Refine components target WCAG 2.1 AA. ARIA roles and states are managed automatically. For the full compliance contract, per-component coverage, and testing strategy, see the [Accessibility](./accessibility.md) page.

The two things you always control:

- **Icon-only buttons** require a `label` attribute — it becomes `aria-label`.
- **Decorative icons** should have `aria-hidden="true"` so screen readers skip them.

---
title: Refine — Usage Guide
description: Register Refine components, configure properties, handle events, compose slots, and integrate frameworks.
---

[[toc]]

## Basic Usage

Load the global design contract once, then register only the components used by the page.

```ts
import '@vielzeug/refine/tokens.css';
import '@vielzeug/refine/button';
import '@vielzeug/refine/input';
import '@vielzeug/refine/dialog';

const input = document.querySelector('ore-input');
const save = document.querySelector('ore-button');

if (!(input instanceof HTMLElement) || !(save instanceof HTMLElement)) {
  throw new Error('Expected Refine controls');
}

save.addEventListener('click', () => {
  console.log((input as HTMLElement & { value: string }).value);
});
```

Add the browser reset only when the application owns global element styling:

```ts
import '@vielzeug/refine/styles/preflight.css';
```

## Set Attributes and Properties

Use attributes for serializable HTML state.

```html
<ore-button variant="outline" color="secondary" size="lg" disabled>
  Save changes
</ore-button>
```

Use JavaScript properties for arrays, objects, callbacks, and controlled state.

```ts
import '@vielzeug/refine/datagrid';
import type { OreDataGridProps } from '@vielzeug/refine/datagrid';

const grid = document.querySelector('ore-datagrid') as HTMLElement & OreDataGridProps;
grid.columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'role', label: 'Role' },
];
grid.rows = [
  { id: '1', name: 'Ada', role: 'Admin' },
  { id: '2', name: 'Linus', role: 'Editor' },
];
```

## Handle Events

Form controls dispatch standard `input` and `change` events. Read their current property from `event.currentTarget`.

```ts
const input = document.querySelector('ore-input');
input?.addEventListener('input', (event) => {
  const target = event.currentTarget as HTMLElement & { value: string };
  console.log(target.value);
});
```

Custom events use kebab-case names and typed detail objects.

```ts
import type { OreDialogEvents } from '@vielzeug/refine/dialog';

const dialog = document.querySelector('ore-dialog');
dialog?.addEventListener('open-change', (event: CustomEvent<OreDialogEvents['open-change']>) => {
  console.log(event.detail.open, event.detail.reason);
});
```

## Compose Slots

Default slots hold primary content. Named slots identify component-owned regions.

```html
<ore-card>
  <span slot="header">Account</span>
  <p>Profile settings</p>
  <div slot="footer">
    <ore-button variant="ghost">Cancel</ore-button>
    <ore-button>Save</ore-button>
  </div>
</ore-card>
```

Input components commonly expose `prefix`, `suffix`, `label`, `helper`, and `error` slots. Each component reference lists its supported slots.

## Load TypeScript Framework Declarations

Import the declaration matching the framework once in an application type entry point.

::: code-group

```ts [DOM]
import type {} from '@vielzeug/refine/frameworks/elements';
```

```ts [React]
import type {} from '@vielzeug/refine/frameworks/react';
```

```ts [Vue]
import type {} from '@vielzeug/refine/frameworks/vue';
```

:::

These entry points provide typed tags and component properties. They do not register components or install runtime adapters.

## Framework Integration

Refine elements use native DOM properties, events, and slots. Frameworks differ only in how they forward custom-element properties and events.

::: code-group

```tsx [React 19]
import '@vielzeug/refine/button';

export function SaveButton() {
  return <ore-button variant="solid">Save</ore-button>;
}
```

```vue [Vue 3]
<script setup lang="ts">
import '@vielzeug/refine/button';
</script>

<template>
  <ore-button variant="solid">Save</ore-button>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import '@vielzeug/refine/button';
</script>

<ore-button variant="solid">Save</ore-button>
```

:::

See [Framework Integration](./frameworks.md) for custom events, controlled properties, SSR guards, and framework-specific configuration.

## Working with Other Vielzeug Libraries

### Ore

Use Ore when authoring a custom element that composes Refine components.

```ts
import '@vielzeug/refine/button';
import { define, html } from '@vielzeug/ore';

define('save-panel', {
  setup() {
    return html`<ore-button @click=${() => console.log('save')}>Save</ore-button>`;
  },
});
```

### Ripple

Use Ripple to drive component properties from application state.

```ts
import '@vielzeug/refine/button';
import { effect, signal } from '@vielzeug/ripple';

const loading = signal(false);
const button = document.querySelector('ore-button') as HTMLElement & { loading?: boolean };
const loadingEffect = effect(() => {
  button.loading = loading.value;
});

loadingEffect.dispose();
```

## Best Practices

- **Import** `tokens.css` once before rendering components.
- **Register** components through explicit subpaths.
- **Set** structured data and callbacks as JavaScript properties.
- **Read** form state from the event target instead of custom event payloads.
- **Provide** accessible labels for icon-only controls.
- **Use** component reference pages for supported slots, parts, and CSS properties.
- **Dispose** application-owned Ripple effects and service handles.
- **Guard** DOM-dependent component registration during SSR.

---
title: Focus — Usage Guide
description: Build keyboard-focus navigation and restoration into composite widgets.
---

[[toc]]

## Basic Usage

Create one navigation handle for a composite widget and forward `keydown` events to it.

```ts
import { createListNavigation } from '@vielzeug/focus';

const nav = createListNavigation({
  getItems: () => items,
  loop: true,
  onNavigate: (_action, index) => items[index]?.focus(),
});

list.addEventListener('keydown', nav.handleKeydown);
```

## Orientation and Direction

Use orientation and direction to derive default key bindings.

```ts
const nav = createListNavigation({
  direction: () => (document.dir === 'rtl' ? 'rtl' : 'ltr'),
  getItems: () => tabs,
  orientation: 'horizontal',
});
```

## Disabled and Dynamic Items

Provide `isItemDisabled` when disabled state is data-driven.

```ts
const nav = createListNavigation({
  getItems: () => rows,
  isItemDisabled: (item) => item.hasAttribute('aria-disabled'),
});
```

## Typeahead

Enable character-based navigation with `getItemLabel`.

```ts
const nav = createListNavigation({
  getItemLabel: (item) => item.textContent ?? '',
  getItems: () => menuItems,
  typeaheadDelayMs: 300,
});
```

`typeaheadDelayMs` defaults to `500` and must be a positive finite number.

## Focus Restoration

Capture focus before opening a floating surface and restore it after closing.

```ts
import { captureFocus } from '@vielzeug/focus';

const restore = captureFocus();

openDialog();
closeDialog();
restore.restore();
```

## Framework Integration

Create the navigation handle once per component instance and dispose it on unmount. The handle is framework-neutral — wire `keydown` from whatever element owns the composite widget's keyboard surface.

::: code-group

```tsx [React]
import { useEffect, useRef } from 'react';
import { createListNavigation } from '@vielzeug/focus';

function Tabs({ tabs }: { tabs: Array<{ id: string; label: string }> }) {
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const nav = createListNavigation({
      getItems: () => tabRefs.current.filter((el): el is HTMLButtonElement => el !== null),
      loop: true,
      onNavigate: (_action, index) => tabRefs.current[index]?.focus(),
      orientation: 'horizontal',
    });

    list.addEventListener('keydown', nav.handleKeydown);
    return () => {
      list.removeEventListener('keydown', nav.handleKeydown);
      nav.dispose();
    };
  }, []);

  return (
    <div ref={listRef} role="tablist">
      {tabs.map((tab, i) => (
        <button
          key={tab.id}
          ref={(el) => { tabRefs.current[i] = el; }}
          role="tab"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

```vue [Vue 3]
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { createListNavigation } from '@vielzeug/focus';

const props = defineProps<{ tabs: Array<{ id: string; label: string }> }>();

const listEl = ref<HTMLDivElement | null>(null);
const tabEls = ref<Array<HTMLButtonElement | null>>([]);

let nav: ReturnType<typeof createListNavigation> | undefined;

onMounted(() => {
  if (!listEl.value) return;

  nav = createListNavigation({
    getItems: () => tabEls.value.filter((el): el is HTMLButtonElement => el !== null),
    loop: true,
    onNavigate: (_action, index) => tabEls.value[index]?.focus(),
    orientation: 'horizontal',
  });

  listEl.value.addEventListener('keydown', nav.handleKeydown);
});

onUnmounted(() => {
  listEl.value?.removeEventListener('keydown', nav?.handleKeydown);
  nav?.dispose();
});
</script>

<template>
  <div ref="listEl" role="tablist">
    <button
      v-for="(tab, i) in props.tabs"
      :key="tab.id"
      :ref="(el) => { tabEls[i] = el as HTMLButtonElement | null; }"
      role="tab"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { onMount } from 'svelte';
  import { createListNavigation } from '@vielzeug/focus';

  let { tabs } = $props<{ tabs: Array<{ id: string; label: string }> }>();

  let listEl: HTMLDivElement;
  let tabEls: HTMLButtonElement[] = [];

  onMount(() => {
    const nav = createListNavigation({
      getItems: () => tabEls,
      loop: true,
      onNavigate: (_action, index) => tabEls[index]?.focus(),
      orientation: 'horizontal',
    });

    listEl.addEventListener('keydown', nav.handleKeydown);
    return () => {
      listEl.removeEventListener('keydown', nav.handleKeydown);
      nav.dispose();
    };
  });
</script>

<div bind:this={listEl} role="tablist">
  {#each tabs as tab, i}
    <button bind:this={tabEls[i]} role="tab">{tab.label}</button>
  {/each}
</div>
```

:::

## Working with Other Vielzeug Libraries

### Focus + Refine

Refine's `ore-menu`, `ore-dialog`, and `ore-list` use Focus internally for keyboard navigation and focus restoration. When building custom composite widgets on top of Refine components, use `createListNavigation` for the keyboard layer and let Refine handle rendering.

```ts
import { createListNavigation } from '@vielzeug/focus';

// Custom tab bar built alongside ore-tab panels
const tabNav = createListNavigation({
  getItems: () => Array.from(host.querySelectorAll('[role="tab"]')),
  loop: true,
  onNavigate: (_action, index) => {
    host.querySelectorAll('[role="tab"]')[index]?.focus();
  },
  orientation: 'horizontal',
});

host.addEventListener('keydown', tabNav.handleKeydown);
```

### Focus + Keymap

Use Keymap for global shortcuts and Focus for composite-widget navigation. They operate on different event layers without conflict.

```ts
import { createKeymap } from '@vielzeug/keymap';
import { createListNavigation } from '@vielzeug/focus';

const nav = createListNavigation({ getItems: () => items, onNavigate: (_a, i) => items[i]?.focus() });

const map = createKeymap({
  'mod+k': () => openPalette(),
  escape: () => nav.reset(),
});

list.addEventListener('keydown', nav.handleKeydown);
map.mount(document);
```

## Best Practices

- **Keep** item discovery in one function.
- **Drive** focus side effects from `onNavigate`.
- **Reset** navigation on overlay close when focus context changes.
- **Use** typeahead only when labels are stable and meaningful.
- **Capture** return focus before opening transient surfaces.
- **Dispose** handles when owners unmount.

---
title: 'Focus: Usage Guide'
description: Build keyboard navigation and restore focus across transient browser interfaces.
---

[[toc]]

## Basic Usage

Create one navigation model for the items in a composite widget. Focus remains an application side effect: apply the returned change after each key operation.

```ts
import { createListNavigation } from '@vielzeug/focus';

const nav = createListNavigation({
  getItems: () => items,
  isItemDisabled: (item) => item.matches('[aria-disabled="true"]'),
  loop: true,
});

const onKeydown = (event: KeyboardEvent) => {
  const result = nav.handleKeydown(event);
  result?.change?.item.focus();
};

list.addEventListener('keydown', onKeydown);
```

`createListNavigation()` owns only index and typeahead state. The layer that attaches the event listener owns its cleanup.

## Inspect Keyboard Results

`handleKeydown()` returns `null` when Focus did not handle the event. Recognized keys return explicit handling state:

```ts
const result = nav.handleKeydown(event);

if (result?.handled && result.change) {
  console.log(result.change.action, result.change.index, result.change.item);
}
```

A boundary arrow may return `{ handled: true, change: null }`: the composite consumed the key but its active item did not move. Events that are already prevented, disabled, or part of IME composition return `null`.

Programmatic navigation returns only committed changes:

```ts
nav.navigate('first')?.item.focus();
nav.navigate('next')?.item.focus();
nav.navigate('prev')?.item.focus();
nav.navigate('last')?.item.focus();
```

`set(index)` accepts integer indexes. Invalid or disabled targets reset navigation to `-1`.

## Configure Orientation and Direction

Direction, orientation, and disabled state may be live getters:

```ts
const nav = createListNavigation({
  direction: () => document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr',
  disabled: () => panel.hidden,
  getItems: () => items,
  orientation: () => 'horizontal',
});
```

Horizontal arrows mirror in RTL. Vertical arrows do not. Custom key tables override defaults and are matched through `matchKey` from `@vielzeug/keymap`, so entries accept aliases and modifiers and require exact modifier state; assigning one key to multiple actions throws `FocusConfigError`.

## Add Typeahead

Provide stable labels for menu, listbox, or command navigation:

```ts
const nav = createListNavigation({
  getItems: () => menuItems,
  typeahead: {
    delayMs: 300,
    getLabel: (item) => item.textContent ?? '',
    preventDefault: true,
  },
});
```

`delayMs` defaults to `500` and must be positive and finite. Repeated characters cycle matching items. Set `preventDefault: true` for menu-style typeahead; leave it false when an editable combobox input must receive the printable key.

## Navigate Grids

Use `createGridNavigation()` when items lay out in rows: vertical arrows step one row, horizontal arrows one item, and Home/End jump to the ends. Point `getActiveIndex` at the DOM so focus moved by pointer or Tab stays in sync:

```ts
import { createGridNavigation } from '@vielzeug/focus';

const tiles = () => [...grid.querySelectorAll<HTMLElement>('.tile')];

const nav = createGridNavigation<HTMLElement>({
  columns: 4,
  getActiveIndex: () => tiles().indexOf(document.activeElement as HTMLElement),
  getItems: tiles,
});

grid.addEventListener('keydown', (event) => {
  nav.handleKeydown(event)?.change?.item.focus();
});
```

`columns` resolves on every navigation, so responsive grids can read a media query and measured grids can read the rendered row length. Clamping is the default; set `loop: true` to wrap moves around the grid's edges by flat index. Items are never skipped when disabled: skipping in two dimensions would break row alignment.

## Restore Focus

Capture focus before opening a transient surface, then invoke the one-shot restorer when it closes:

```ts
import { captureFocus } from '@vielzeug/focus';

const restore = captureFocus({
  fallback: () => document.querySelector<HTMLElement>('#main'),
  preventScroll: true,
});

dialog.showModal();
dialog.addEventListener('close', restore, { once: true });
```

A supplied signal can cancel pending restoration:

```ts
const controller = new AbortController();
const restore = captureFocus({ signal: controller.signal });

controller.abort();
restore(); // false
```

Use `restoreFocus()` directly when the target is already known. Disconnected, disabled, inert, throwing, or non-focusable targets fall through to the lazy fallback.

When the focused element unmounts: browsing a dialog whose swap removes the item that held focus: the browser drops focus to `<body>`, where keydown never reaches a handler. Call `rescueFocus()` after the swap to hand focus to a control that survives it:

```ts
import { rescueFocus } from '@vielzeug/focus';

const onAfterSwap = () => {
  rescueFocus(() => footer.querySelector<HTMLElement>('button'));
};
```

`rescueFocus()` returns `false` without touching anything when focus is already on a real element, so it is safe to call from both a watcher and a transition's after-leave hook.

## Framework Integration

Create navigation once per mounted widget. Framework cleanup removes only the event listener because the navigation model owns no external resources.

::: code-group

```tsx [React]
import { useEffect, useRef } from 'react';
import { createListNavigation } from '@vielzeug/focus';

function Tabs({ tabs }: { tabs: string[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const nav = createListNavigation({
      getItems: () => tabRefs.current.filter((item): item is HTMLButtonElement => item !== null),
      loop: true,
      orientation: 'horizontal',
    });
    const onKeydown = (event: KeyboardEvent) => nav.handleKeydown(event)?.change?.item.focus();

    list.addEventListener('keydown', onKeydown);
    return () => list.removeEventListener('keydown', onKeydown);
  }, []);

  return (
    <div ref={listRef} role="tablist">
      {tabs.map((tab, index) => (
        <button key={tab} ref={(element) => { tabRefs.current[index] = element; }}>{tab}</button>
      ))}
    </div>
  );
}
```

```ts [Vue]
import { onMounted, onUnmounted, ref } from 'vue';
import { createListNavigation } from '@vielzeug/focus';

const list = ref<HTMLElement>();
let onKeydown: ((event: KeyboardEvent) => void) | undefined;

onMounted(() => {
  const nav = createListNavigation({ getItems: () => items, orientation: 'horizontal' });
  onKeydown = (event) => nav.handleKeydown(event)?.change?.item.focus();
  list.value?.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  if (onKeydown) list.value?.removeEventListener('keydown', onKeydown);
});
```

```ts [Svelte]
import { onMount } from 'svelte';
import { createListNavigation } from '@vielzeug/focus';

onMount(() => {
  const nav = createListNavigation({ getItems: () => items, orientation: 'horizontal' });
  const onKeydown = (event: KeyboardEvent) => nav.handleKeydown(event)?.change?.item.focus();
  list.addEventListener('keydown', onKeydown);
  return () => list.removeEventListener('keydown', onKeydown);
});
```

:::

## Integrate with Keymap

Use Focus for local composite navigation and Keymap for application shortcuts:

```ts
import { createListNavigation } from '@vielzeug/focus';
import { createKeymap } from '@vielzeug/keymap';

const nav = createListNavigation({ getItems: () => items });
const onKeydown = (event: KeyboardEvent) => nav.handleKeydown(event)?.change?.item.focus();
const map = createKeymap([
  { id: 'palette', shortcut: 'mod+k', handler: () => openPalette() },
  { id: 'reset', shortcut: 'escape', handler: () => nav.reset() },
]);

list.addEventListener('keydown', onKeydown);
map.mount(document);
```

## Best Practices

- Keep item discovery in one live `getItems()` function.
- Apply focus from returned changes rather than hiding effects in navigation state.
- Treat `{ handled: true, change: null }` as a consumed boundary key.
- Ignore events before Focus when an inner widget already called `preventDefault()`.
- Reset navigation when an overlay closes or its item context changes.
- Use typeahead only with stable labels, and set `preventDefault` according to whether the keyboard surface is editable.
- Capture return focus before opening transient surfaces.
- Rescue focus after swaps that can unmount the focused element.
- Remove the owning event listener when a widget unmounts.

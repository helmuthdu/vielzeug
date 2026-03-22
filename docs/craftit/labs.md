---
title: Craftit Labs — Controllers & Navigation
description: Low-level controllers for building custom interactive widgets. Compose list navigation, overlay interactions, and selection models.
---

# Craftit Labs — Primitives

Craftit/labs exports three core primitives—headless controllers that handle stateless, reusable logic for interactive UI patterns. Use them to compose custom dropdowns, menus, autocompletes, and other overlay-based widgets.

[[toc]]

## Overview

Primitives are **framework-agnostic, headless controllers** that separate behavior from DOM structure:

- **`createListNavigation`** — keyboard navigation with arrow keys, Home/End, looping, and disabled item skipping
- **`createOverlayControl`** — open/close/toggle orchestration with positioning, focus management, and outside click handling
- **`createSelectionModel`** — single/multiple selection with toggle/clear/serialize operations

Import them from `@vielzeug/craftit/labs`:

```ts
import {
  createListNavigation,
  createOverlayControl,
  createSelectionModel,
} from '@vielzeug/craftit/labs';
```

## `createListNavigation`

Manages keyboard navigation through a list of items, with support for disabled items, looping, and focus synchronization.

### Type Signature

```ts
type ListNavigationOptions<T> = {
  /** Current active index */
  getIndex: () => number;
  
  /** List of items to navigate */
  getItems: () => T[];
  
  /** Check if an item is disabled (optional) */
  isItemDisabled?: (item: T, index: number) => boolean;
  
  /** Enable wrapping when reaching start/end (default: false) */
  loop?: boolean;
  
  /** Update the active index */
  setIndex: (index: number) => void;
};

type ListNavigationController<T> = {
  /** Jump to the first enabled item */
  first: () => number;
  
  /** Get the currently active item */
  getActiveItem: () => T | undefined;
  
  /** Get the index of the first enabled item at or after `index` */
  getEnabledIndex: (index: number) => number;
  
  /** Jump to the last enabled item */
  last: () => number;
  
  /** Move to next enabled item (with wrapping if loop=true) */
  next: () => number;
  
  /** Move to previous enabled item (with wrapping if loop=true) */
  prev: () => number;
  
  /** Reset to no selection (-1) */
  reset: () => void;
  
  /** Set active index, skipping disabled items */
  set: (index: number) => number;
};

const nav = createListNavigation<T>(options);
```

### Behavior

- **Disabled items**: Automatically skipped during navigation. Define via `isItemDisabled` callback or `item.disabled` boolean.
- **Looping**: When `loop=true`, `next()` after the last item wraps to the first, and vice versa.
- **Home/End support**: Call `first()` or `last()` from keyboard event handlers.
- **Returns -1** when no enabled items exist (e.g., all disabled).

### Example: Menu with Navigation

```ts
// State
let activeIndex = -1;
const items = [
  { label: 'Copy', disabled: false },
  { label: 'Paste', disabled: true },
  { label: 'Delete', disabled: false },
];

// Create controller
const nav = createListNavigation({
  getIndex: () => activeIndex,
  getItems: () => items,
  isItemDisabled: (item) => item.disabled,
  loop: true, // wrap from end to start
  setIndex: (idx) => {
    activeIndex = idx;
    // Update DOM focus
    const itemEl = menuItems[idx];
    itemEl?.focus();
  },
});

// Keyboard handling
function handleKeydown(e) {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      nav.next();
      break;
    case 'ArrowUp':
      e.preventDefault();
      nav.prev();
      break;
    case 'Home':
      e.preventDefault();
      nav.first();
      break;
    case 'End':
      e.preventDefault();
      nav.last();
      break;
  }
}

// Select item on Enter
function handleSelect(e) {
  const item = nav.getActiveItem();
  if (item) {
    console.log('Selected:', item.label);
  }
}
```

### Real-world Usage

See Buildit's `Menu`, `Select`, and `Combobox` components for complete examples.

---

## `createOverlayControl`

Manages opening/closing, positioning, focus restoration, and outside-click dismissal for overlay-based components (menus, popovers, dialogs, etc.).

### Type Signature

```ts
type OverlayPositioner = {
  /** Get reference element (e.g., trigger) */
  reference: () => HTMLElement | null;
  
  /** Get floating element (e.g., panel) */
  floating: () => HTMLElement | null;
  
  /** Update positioning (called when overlay opens or reference moves) */
  update: () => void;
};

type OverlayControlOptions = {
  /** The boundary element (usually the component root) */
  getBoundaryElement: () => HTMLElement | null;
  
  /** Optional: the interactive panel element */
  getPanelElement?: () => HTMLElement | null;
  
  /** Optional: the trigger element (receives focus on close) */
  getTriggerElement?: () => HTMLElement | null;
  
  /** Optional: disable the overlay */
  isDisabled?: () => boolean;
  
  /** Current open state */
  isOpen: () => boolean;
  
  /** Callback when overlay closes */
  onClose?: () => void;
  
  /** Callback when overlay opens */
  onOpen?: () => void;
  
  /** Optional: positioning provider (e.g., from @vielzeug/floatit) */
  positioner?: OverlayPositioner;
  
  /** Restore focus to trigger on close (default: true) */
  restoreFocus?: boolean | (() => boolean);
  
  /** Update open state */
  setOpen: (next: boolean) => void;
};

type OverlayControl = {
  /** Close the overlay, optionally restoring focus */
  close: (opts?: { restoreFocus?: boolean }) => void;
  
  /** Open the overlay */
  open: () => void;
  
  /** Toggle between open/closed */
  toggle: () => void;
  
  /** Bind outside-click handler (click outside boundary/panel closes overlay) */
  bindOutsideClick: (target?: Document | HTMLElement, capture?: boolean) => () => void;
};

const overlay = createOverlayControl(options);
```

### Behavior

- **Open/Close**: Respects `isDisabled()` and updates state via `setOpen()`.
- **Positioning**: If `positioner` is provided, calls `update()` when opening and manages cleanup.
- **Focus restoration**: On close, optionally focuses the trigger element (respects `restoreFocus` option).
- **Outside clicks**: `bindOutsideClick()` automatically closes when clicking outside the boundary/panel.

### Example: Custom Popover with Positioning

```ts
import { positionFloat, offset, flip, shift } from '@vielzeug/floatit';

let isOpen = false;
let triggerEl: HTMLElement | null = null;
let panelEl: HTMLElement | null = null;

const overlay = createOverlayControl({
  getBoundaryElement: () => componentRoot,
  getTriggerElement: () => triggerEl,
  getPanelElement: () => panelEl,
  isDisabled: () => false,
  isOpen: () => isOpen,
  restoreFocus: true,
  setOpen: (next) => {
    isOpen = next;
    // Update DOM classes/visibility
    panelEl?.classList.toggle('open', isOpen);
  },
  positioner: {
    reference: () => triggerEl,
    floating: () => panelEl,
    update: () => {
      if (!triggerEl || !panelEl) return;
      positionFloat(triggerEl, panelEl, {
        placement: 'bottom',
        middleware: [offset(8), flip(), shift({ padding: 6 })],
      });
    },
  },
  onOpen: () => emit('popover:open'),
  onClose: () => emit('popover:close'),
});

// Keyboard: toggle on click
triggerEl?.addEventListener('click', () => overlay.toggle());

// Keyboard: close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isOpen) {
    overlay.close();
  }
});

// Auto-close on outside click
const unbindOutsideClick = overlay.bindOutsideClick(document);
```

### Real-world Usage

See Buildit's `Menu` component for a complete example combining `createListNavigation` + `createOverlayControl`.

---

## `createSelectionModel`

Manages single or multiple selection with toggle, select, clear, and serialization operations.

### Type Signature

```ts
type SelectionItem = {
  label?: string;
  value: string;
};

type SelectionMode = 'single' | 'multiple';

type SelectionModelOptions<T extends SelectionItem> = {
  /** Get current selection mode */
  getMode: () => SelectionMode;
  
  /** Get currently selected items */
  getSelected: () => T[];
  
  /** Update selected items */
  setSelected: (next: T[]) => void;
};

type SelectionModel<T extends SelectionItem> = {
  /** Clear all selections */
  clear: () => void;
  
  /** Check if a value is selected */
  isSelected: (value: string) => boolean;
  
  /** Get labels of selected items */
  labels: () => string[];
  
  /** Remove an item by value */
  remove: (value: string) => void;
  
  /** Add an item (no-op if already selected in multiple mode) */
  select: (item: T) => void;
  
  /** Get comma-separated values (or custom separator) */
  serialize: (separator?: string) => string;
  
  /** Replace selected items from array */
  setFromValues: (values: T[]) => void;
  
  /** Toggle selection of an item */
  toggle: (item: T) => void;
  
  /** Get values of selected items */
  values: () => string[];
};

const selection = createSelectionModel<T>(options);
```

### Behavior

- **Single mode**: Only one item can be selected at a time.
- **Multiple mode**: Many items can be selected; `toggle()` adds/removes.
- **Deduplication**: `setFromValues()` removes duplicates by value.
- **Serialization**: `serialize()` joins values with a separator (useful for form submissions).

### Example: Multi-select Dropdown

```ts
let selectedItems: Item[] = [];

const selection = createSelectionModel({
  getMode: () => 'multiple' as const,
  getSelected: () => selectedItems,
  setSelected: (next) => {
    selectedItems = next;
    // Update UI: badges, chips, input value, etc.
  },
});

// Toggle item on click
function handleItemClick(item: Item) {
  selection.toggle(item);
}

// Get form value
function getFormValue() {
  return selection.serialize(','); // e.g., "id-1,id-2,id-3"
}

// Clear all
function handleClear() {
  selection.clear();
}
```

### Real-world Usage

See Buildit's `Select` and `Combobox` components for complete examples.

---

## Composing Custom Widgets

Combine the three primitives to build custom interactive widgets. Here's a minimal custom autocomplete:

```ts
import {
  createListNavigation,
  createOverlayControl,
  createSelectionModel,
} from '@vielzeug/craftit/labs';
import { positionFloat, offset, flip, shift } from '@vielzeug/floatit';

export function setupCustomAutocomplete(hostElement: HTMLElement) {
  // DOM references
  const inputEl = hostElement.querySelector<HTMLInputElement>('input');
  const listEl = hostElement.querySelector<HTMLElement>('[role="listbox"]');
  const buttonEl = hostElement.querySelector<HTMLElement>('button');

  if (!inputEl || !listEl || !buttonEl) return;

  // State
  let isOpen = false;
  let selectedIndex = -1;
  let allOptions: Item[] = []; // populated from data source

  // 1. Create list navigation (keyboard: up/down/home/end)
  const nav = createListNavigation({
    getIndex: () => selectedIndex,
    getItems: () => allOptions.filter((o) => !o.disabled),
    setIndex: (idx) => {
      selectedIndex = idx;
      updateFocusedOptionUI(idx);
    },
  });

  // 2. Create overlay controller (open/close/positioning)
  function updatePosition() {
    positionFloat(inputEl, listEl, {
      placement: 'bottom-start',
      middleware: [offset(4), flip(), shift({ padding: 6 })],
    });
  }

  const overlay = createOverlayControl({
    getBoundaryElement: () => hostElement,
    getTriggerElement: () => inputEl,
    getPanelElement: () => listEl,
    isOpen: () => isOpen,
    setOpen: (next) => {
      isOpen = next;
      listEl.hidden = !isOpen;
      if (!isOpen) nav.reset();
    },
    positioner: {
      reference: () => inputEl,
      floating: () => listEl,
      update: updatePosition,
    },
  });

  // 3. Create selection model (toggle/select operations)
  let selected: Item[] = [];
  const selection = createSelectionModel({
    getMode: () => 'single' as const,
    getSelected: () => selected,
    setSelected: (next) => {
      selected = next;
      inputEl.value = selection.labels().join(', ');
    },
  });

  // ── Keyboard handling ──
  inputEl.addEventListener('keydown', (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === ' ')) {
      e.preventDefault();
      overlay.open();
      nav.first();
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        nav.next();
        break;
      case 'ArrowUp':
        e.preventDefault();
        nav.prev();
        break;
      case 'Home':
        e.preventDefault();
        nav.first();
        break;
      case 'End':
        e.preventDefault();
        nav.last();
        break;
      case 'Enter':
        e.preventDefault();
        selectActive();
        overlay.close();
        break;
      case 'Escape':
        e.preventDefault();
        overlay.close();
        break;
    }
  });

  // Click option
  listEl.addEventListener('click', (e) => {
    const optionEl = (e.target as HTMLElement).closest('[data-value]');
    if (optionEl) {
      const value = optionEl.getAttribute('data-value');
      const item = allOptions.find((o) => o.value === value);
      if (item) {
        selection.select(item);
        overlay.close();
      }
    }
  });

  // Outside click closes
  overlay.bindOutsideClick(document);

  // Toggle button
  buttonEl?.addEventListener('click', () => overlay.toggle());

  // ── Helpers ──
  function selectActive() {
    const item = nav.getActiveItem();
    if (item) selection.select(item);
  }

  function updateFocusedOptionUI(index: number) {
    listEl.querySelectorAll('[data-focused]').forEach((el) => el.removeAttribute('data-focused'));
    if (index >= 0) {
      const optionEl = listEl.children[index];
      if (optionEl) optionEl.setAttribute('data-focused', '');
    }
  }

  return { overlay, nav, selection };
}
```

---

## Best Practices

1. **Separate state from DOM**: Controllers manage logic; you manage DOM updates via callbacks.
2. **Use weak refs**: Pass getter functions (e.g., `getIndex: () => state.index`) to avoid stale closures.
3. **Focus management**: Pair `createListNavigation` with DOM focus updates in `setIndex` callback.
4. **Accessibility**: Leverage primitives for ARIA attributes, roles, and keyboard support.
5. **Positioning**: Combine `createOverlayControl` with `@vielzeug/floatit` for automatic positioning.

---

## API Reference

### Exports

From `@vielzeug/craftit/labs`:

```ts
export {
  createListNavigation,
  type ListNavigationController,
  type ListNavigationOptions,
} from './create-list-navigation';

export {
  createOverlayControl,
  type OverlayControl,
  type OverlayControlOptions,
  type OverlayPositioner,
} from './create-overlay-control';

export {
  createSelectionModel,
  type SelectionItem,
  type SelectionMode,
  type SelectionModel,
  type SelectionModelOptions,
} from './create-selection-model';
```

---

## See Also

- [Buildit Menu component](../buildit/components/menu.md) — Real-world example using all three primitives
- [Buildit Select component](../buildit/components/select.md) — Dropdown with multiple selection
- [Buildit Combobox component](../buildit/components/combobox.md) — Searchable select
- [@vielzeug/floatit](../floatit/index.md) — Positioning engine for overlays

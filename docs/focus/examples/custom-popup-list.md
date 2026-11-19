---
title: 'Focus Examples: Custom Popup List'
description: 'Compose orbit, createListNavigation, createDismissal, captureFocus and announce into a popup list that no ore-* component covers.'
---

## Custom Popup List

### Problem

A command launcher that opens beside a button, filters a fixed list as you type, and closes on outside click or Escape. No `ore-*` component fits exactly (this one must render a bespoke two-line row layout inside a canvas overlay). Prefer `ore-popover`, `ore-combobox`, or `ore-select` whenever one of them fits; compose the primitives only when none does.

### Solution

Compose four primitives, each owning one behavior:

- `orbit` `createPositioner`: anchoring and viewport flipping.
- `focus` `createListNavigation`: arrow keys, Home/End, and typeahead over the filtered items.
- `focus` `createDismissal`: outside-pointer and Escape dismissal.
- `focus` `captureFocus` + `announce`: return focus to the trigger and report the result count.

```html
<button id="launcher" aria-haspopup="listbox" aria-expanded="false" aria-controls="launcher-panel">
  Insert block
</button>

<div id="launcher-panel" role="listbox" aria-label="Blocks" hidden>
  <ul id="launcher-list"></ul>
</div>
```

```ts
import { announce, captureFocus, createDismissal, createListNavigation } from '@vielzeug/focus';
import { createPositioner } from '@vielzeug/orbit';

const trigger = document.getElementById('launcher') as HTMLButtonElement;
const panel = document.getElementById('launcher-panel') as HTMLElement;
const list = document.getElementById('launcher-list') as HTMLElement;

const controller = new AbortController();
const { signal } = controller;

const blocks = [
  { id: 'text', label: 'Text', hint: 'A plain paragraph' },
  { id: 'image', label: 'Image', hint: 'Upload or link a file' },
  { id: 'code', label: 'Code', hint: 'A highlighted snippet' },
  { id: 'quote', label: 'Quote', hint: 'A block quotation' },
];

let open = false;
let restore: (() => boolean) | null = null;

// The positioner owns its own lifecycle: dispose it when the owner ends.
const positioner = createPositioner(trigger, panel, { placement: 'bottom-start' });

const nav = createListNavigation({
  getItems: () => [...list.querySelectorAll<HTMLElement>('[role="option"]')],
  loop: true,
});

function render(query: string): void {
  const matches = blocks.filter((block) => block.label.toLowerCase().startsWith(query.toLowerCase()));

  list.innerHTML = '';
  for (const block of matches) {
    const option = document.createElement('li');

    option.id = `block-${block.id}`;
    option.role = 'option';
    option.tabIndex = -1;
    option.textContent = `${block.label} — ${block.hint}`;
    list.append(option);
  }

  nav.reset();
  announce(`${matches.length} blocks`);
}

function setOpen(next: boolean): void {
  if (open === next) return;

  open = next;
  panel.hidden = !next;
  trigger.setAttribute('aria-expanded', String(next));

  if (next) {
    restore = captureFocus();
    render('');
    positioner.update();
    panel.querySelector<HTMLElement>('[role="option"]')?.focus();
  } else {
    restore?.();
    restore = null;
  }
}

trigger.addEventListener(
  'click',
  () => {
    setOpen(!open);
  },
  { signal },
);

// Dismissal: outside pointer or Escape. The trigger is a boundary so the
// click that opened the panel does not immediately close it.
createDismissal({
  getTargets: () => (open ? [trigger, panel] : []),
  isActive: () => open,
  onDismiss: () => setOpen(false),
  escape: true,
  ownerDocument: trigger.ownerDocument,
  signal,
});

// Keyboard: navigation inside the panel, Enter to choose.
panel.addEventListener(
  'keydown',
  (event) => {
    if (event.key === 'Enter') {
      const active = nav.getActiveItem();

      if (active) {
        announce(`Inserted ${active.textContent}`);
        setOpen(false);
      }

      return;
    }

    const result = nav.handleKeydown(event);

    if (result?.change) {
      result.change.item.focus();
    }
  },
  { signal },
);

// Type from the trigger jumps into the list and filters.
trigger.addEventListener(
  'keydown',
  (event) => {
    if (open || event.key.length !== 1) return;

    setOpen(true);
    render(event.key);
    panel.querySelector<HTMLElement>('[role="option"]')?.focus();
  },
  { signal },
);
```

### Verification

The composed control must pass the behavior checklist before it ships:

1. **ARIA state:** after open, `aria-expanded="true"` on the trigger and `role="option"` items inside the `role="listbox"` panel; after close, `aria-expanded="false"` and `hidden`.

   ```ts
   import { eventually, fireClick, fireKeyDown, within } from '@vielzeug/assay';

   fireClick(trigger);
   await eventually(() => expect(trigger.getAttribute('aria-expanded')).toBe('true'));
   expect(within(panel).queryAll('[role="option"]')).toHaveLength(4);
   ```

2. **Interaction states:** ArrowDown moves the active option, disabled options are skipped (add `isItemDisabled` if the list has them), Enter selects, Escape closes and focus returns to the trigger, an outside pointerdown closes, and nothing happens after `controller.abort()`.

   ```ts
   fireKeyDown(panel, { key: 'ArrowDown' });
   await eventually(() => expect(document.activeElement).toBe(list.children[1]));

   fireKeyDown(panel, { key: 'Escape' });
   await eventually(() => expect(document.activeElement).toBe(trigger));
   ```

3. **Automated accessibility:** run an axe scan against the closed and open states with the project's axe setup, or mark the scan `[VERIFY]` if the project has none.

4. **Real browser:** confirm `:focus-visible` styling on options, and that dismissal works when the panel renders inside a shadow root. jsdom cannot check either.

### Pitfalls

- **Include the trigger in `getTargets`.** Without it, the pointerdown that opened the panel is seen as an outside click and the panel closes in the same gesture.
- **Guard `isActive` before returning targets.** Returning stale panel elements while closed lets interactions inside the closed panel's rect suppress unrelated dismissals.
- **Leave `escape` unset when something else owns Escape.** A dialog or drawer that already closes on Escape must not register a second dismissal for the key; only one escape-enabled dismissal acts per keypress (newest surface first), so a duplicate handle is dead weight at best and a double-close at worst.
- **`announce()` keeps only the last message.** Rapid `render()` calls during typing announce only the final count; that is intended latest-value behavior, not a bug to debounce again.
- **The positioner owns its own disposal.** It takes no `signal`; call `positioner.dispose()` (or use `using`) when the owner unmounts.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Dialog Return Focus Restoration](./dialog-return-focus-restoration.md)
- [Refine](/refine/)

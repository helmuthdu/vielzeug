---
title: 'Focus Examples — Roving Tabs Keyboard Navigation'
description: 'Implement roving keyboard navigation for tabs with createListNavigation.'
---

## Roving Tabs Keyboard Navigation

### Problem

You need consistent Arrow/Home/End navigation for a tab list while leaving activation policy in component code. Tabs should follow the WAI-ARIA [tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/): Arrow keys move focus between tabs without activating them, and activation happens on Space/Enter (manual) or immediately (automatic).

### Solution

Create a list-navigation model for the `tablist` and apply returned changes to roving tabindex and DOM focus. The model owns only navigation state; your component owns focus and activation.

```html
<div role="tablist" aria-label="Sections" id="tablist">
  <button role="tab" id="tab-overview" aria-controls="panel-overview" aria-selected="true">Overview</button>
  <button role="tab" id="tab-usage" aria-controls="panel-usage" tabindex="-1">Usage</button>
  <button role="tab" id="tab-api" aria-controls="panel-api" tabindex="-1">API</button>
  <button role="tab" id="tab-examples" aria-controls="panel-examples" tabindex="-1" aria-disabled="true">Examples</button>
</div>
<section role="tabpanel" id="panel-overview" aria-labelledby="tab-overview">Overview content</section>
<section role="tabpanel" id="panel-usage" aria-labelledby="tab-usage" hidden>Usage content</section>
<section role="tabpanel" id="panel-api" aria-labelledby="tab-api" hidden>API content</section>
<section role="tabpanel" id="panel-examples" aria-labelledby="tab-examples" hidden>Examples content</section>
```

```ts
import { createListNavigation } from '@vielzeug/focus';

const tablist = document.getElementById('tablist')!;
const tabs = Array.from(tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]'));

const nav = createListNavigation({
  getItems: () => tabs,
  isItemDisabled: (tab) => tab.getAttribute('aria-disabled') === 'true',
  loop: true,
  orientation: 'horizontal',
});

const applyChange = (change: { index: number; item: HTMLButtonElement } | null) => {
  if (!change) return;
  tabs.forEach((tab) => {
    const isActive = tab === change.item;
    tab.tabIndex = isActive ? 0 : -1;
  });
  change.item.focus();
  activeTabIndex = change.index;
};

let activeTabIndex = 0;

tablist.addEventListener('keydown', (event) => {
  // Let Focus handle Arrow/Home/End; handle activation separately.
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    activateTab(event.target as HTMLButtonElement);
    return;
  }
  applyChange(nav.handleKeydown(event)?.change ?? null);
});

// Keep the handle's index in sync when focus enters from a pointer click.
tablist.addEventListener('click', (event) => {
  const tab = (event.target as HTMLElement).closest('[role="tab"]') as HTMLButtonElement | null;
  if (!tab) return;
  const index = tabs.indexOf(tab);
  if (index >= 0) nav.set(index);
});

function activateTab(tab: HTMLButtonElement): void {
  tabs.forEach((candidate) => candidate.setAttribute('aria-selected', String(candidate === tab)));
  const panelId = tab.getAttribute('aria-controls');
  if (!panelId) return;
  document.querySelectorAll<HTMLElement>('[role="tabpanel"]').forEach((panel) => {
    panel.hidden = panel.id !== panelId;
  });
}
```

### Pitfalls

- **Roving tabindex is your responsibility.** Focus returns navigation changes but does not move DOM focus or toggle `tabindex` — call `set(index)` from pointer click handlers so the next Tab keypress lands on the clicked tab, not the previously focused one.
- **Keep all tabs in `getItems()` and mark disabled entries with `isItemDisabled`.** Filtering changes index meaning and can desynchronize pointer-driven `set(index)` calls.
- **Separate focus movement from activation.** Automatic activation (focus → activate) is simpler but hostile to screen-magnifier users who Arrow through tabs to read labels. Default to manual activation on Enter/Space.
- **Use `set(index)` when focus enters from pointer.** Otherwise the next Arrow key moves from the last keyboard-focused tab, not the clicked one.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Dialog Return Focus Restoration](./dialog-return-focus-restoration.md)
- [Keymap](/keymap/)

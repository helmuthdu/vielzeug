---
title: 'Focus Examples — Roving Tabs Keyboard Navigation'
description: 'Implement roving keyboard navigation for tabs with createListNavigation.'
---

## Roving Tabs Keyboard Navigation

### Problem

You need consistent Arrow/Home/End navigation for a tab list while leaving activation policy in component code. Tabs should follow the WAI-ARIA [tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/): Arrow keys move focus between tabs without activating them, and activation happens on Space/Enter (manual) or immediately (automatic).

### Solution

Create a list-navigation handle scoped to the `tablist` element and focus tab buttons from the `onNavigate` callback. The handle owns the roving-index state; your component owns what "activation" means.

```html
<div role="tablist" aria-label="Sections" id="tablist">
  <button role="tab" id="tab-overview" aria-controls="panel-overview" aria-selected="true">Overview</button>
  <button role="tab" id="tab-usage" aria-controls="panel-usage" tabindex="-1">Usage</button>
  <button role="tab" id="tab-api" aria-controls="panel-api" tabindex="-1">API</button>
  <button role="tab" id="tab-examples" aria-controls="panel-examples" tabindex="-1" aria-disabled="true">Examples</button>
</div>
```

```ts
import { createListNavigation } from '@vielzeug/focus';

const tablist = document.getElementById('tablist')!;
const tabs = Array.from(tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]'));

const nav = createListNavigation({
  getItems: () => tabs.filter((tab) => tab.getAttribute('aria-disabled') !== 'true'),
  isItemDisabled: (tab) => tab.getAttribute('aria-disabled') === 'true',
  loop: true,
  onNavigate: ({ index, item }) => {
    // Roving tabindex: only the focused tab is in the tab order.
    tabs.forEach((tab) => {
      const isActive = tab === item;
      tab.tabIndex = isActive ? 0 : -1;
      tab.setAttribute('aria-selected', String(isActive));
    });
    item.focus();

    // Keep the handle's index aligned with pointer-driven focus changes.
    activeTabIndex = index;
  },
  orientation: 'horizontal',
});

let activeTabIndex = 0;

tablist.addEventListener('keydown', (event) => {
  // Let Focus handle Arrow/Home/End; handle activation separately.
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    activateTab(event.target as HTMLButtonElement);
    return;
  }
  nav.handleKeydown(event);
});

// Keep the handle's index in sync when focus enters from a pointer click.
tablist.addEventListener('click', (event) => {
  const tab = (event.target as HTMLElement).closest('[role="tab"]') as HTMLButtonElement | null;
  if (!tab) return;
  const index = tabs.indexOf(tab);
  if (index >= 0) nav.set(index);
});

function activateTab(tab: HTMLButtonElement): void {
  const panelId = tab.getAttribute('aria-controls');
  if (!panelId) return;
  document.getElementById(panelId)?.scrollIntoView({ behavior: 'smooth' });
}
```

### Pitfalls

- **Roving tabindex is your responsibility.** Focus moves the active element but does not toggle `tabindex` — call `set(index)` from pointer click handlers so the next Tab keypress lands on the clicked tab, not the previously focused one.
- **Filter disabled tabs in `getItems()`, not in `onNavigate`.** Returning a filtered list keeps index math consistent; skipping inside `onNavigate` desyncs the internal index from the visible focus. Pair it with `isItemDisabled` so the handle also skips disabled items during wrapping.
- **Separate focus movement from activation.** Automatic activation (focus → activate) is simpler but hostile to screen-magnifier users who Arrow through tabs to read labels. Default to manual activation on Enter/Space.
- **Use `set(index)` when focus enters from pointer.** Otherwise the next Arrow key moves from the last keyboard-focused tab, not the clicked one.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Dialog Return Focus Restoration](./dialog-return-focus-restoration.md)
- [Keymap](/keymap/)

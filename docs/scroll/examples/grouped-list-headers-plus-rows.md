---
title: 'Scroll Examples — Grouped List (Headers + Rows)'
description: 'Grouped List (Headers + Rows) examples for scroll.'
---

## Grouped List (Headers + Rows)

### Problem

Your data is organized into named groups, each with a header row followed by its items. The list must render headers and rows in a single virtualized pass, with sticky section headers that stay pinned while the section is in view.

### Solution

Use `createGroupedVirtualizer`, which manages the flat index mapping internally and provides sticky header state via `stickyHeader` in `onChange`.

```ts
import { createGroupedVirtualizer } from '@vielzeug/scroll';

type Contact = { id: number; name: string };

const sections = [
  {
    label: 'A',
    items: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Adam' },
    ],
  },
  { label: 'B', items: [{ id: 3, name: 'Bob' }] },
  {
    label: 'C',
    items: [
      { id: 4, name: 'Carol' },
      { id: 5, name: 'Chris' },
    ],
  },
];

const virt = createGroupedVirtualizer<Contact>(scrollEl, {
  estimateHeaderSize: 32,
  estimateItemSize: 44,
  sections,
  onChange: ({ headers, items, stickyHeader, totalSize }) => {
    listEl.style.height = `${totalSize}px`;
    listEl.innerHTML = '';

    // Sticky header overlay (pinned at top while section is in view)
    if (stickyHeader) {
      const el = document.createElement('div');
      el.className = 'group-header sticky';
      el.style.cssText = 'position:sticky;top:0;z-index:1;height:32px;';
      el.textContent = stickyHeader.label;
      listEl.appendChild(el);
    }

    // Regular headers (positioned absolutely in the scroll flow)
    for (const header of headers) {
      const el = document.createElement('div');
      el.className = 'group-header';
      el.style.cssText = `position:absolute;top:${header.start}px;left:0;right:0;height:${header.size}px;`;
      el.textContent = header.label;
      listEl.appendChild(el);
    }

    // Items
    for (const item of items) {
      const el = document.createElement('div');
      el.className = 'row';
      el.style.cssText = `position:absolute;top:${item.start}px;left:0;right:0;height:${item.size}px;`;
      el.textContent = item.data.name;
      listEl.appendChild(el);
    }
  },
});

// Update sections (e.g., after filtering)
virt.update(nextSections);

// Jump to a section by index
virt.scrollToSection(2, { align: 'start' });

// Jump to item 1 in section 0
virt.scrollToItem(0, 1, { align: 'auto' });

// Cleanup
virt.destroy();
```

---

### Pitfalls

- `update(sections)` rebuilds the flat index from scratch. Pass the full sections array — not a partial diff.
- `stickyHeader` is `null` when the scroll position is at the very top of the list (before any section header has scrolled out of view). Render it conditionally.
- `scrollToSection` and `scrollToItem` are silent no-ops for out-of-range indices.

### Related

- [Basic Fixed-Height List](./basic-fixed-height-list.md)
- [Density Toggle (Compact / Comfortable)](./density-toggle-compact-comfortable.md)
- [Explicit Resource Management (`using`)](./explicit-resource-management-using.md)

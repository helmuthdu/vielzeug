---
title: 'Necromancer Examples — Animate a Reorder'
description: 'Animate a list reorder with transform-safe positional FLIP in @vielzeug/necromancer.'
---

## Animate a Reorder

### Problem

You need to move an item to a new list position without an abrupt layout jump. `captureLayout()` returns a one-shot transition that owns the captured positions.

### Solution

Capture the rows, commit the reorder, then animate the changed positions.

```ts
import { captureLayout } from '@vielzeug/necromancer';

const list = document.createElement('ul');
const rows = ['First', 'Second', 'Third'].map((label) => {
  const row = document.createElement('li');
  row.textContent = label;
  row.style.cssText = 'padding: 6px; margin: 4px 0; background: #f1f5f9;';
  list.append(row);
  return row;
});
document.body.append(list);

const transition = captureLayout(rows);
list.prepend(rows[2]!);

const group = transition.animate({ duration: 220, easing: 'ease-out' });
await group.results;
group.dispose();
```

### Pitfalls

- Capture before changing DOM order, dimensions, or layout-affecting styles.
- Call `transition.animate()` only after the DOM change has committed and layout reflects it.
- When rendering replaces rows, capture with `getKey` and pass the committed rows through `animate({ elements })`. The key must be unique and non-empty.
- Each layout transition is single-use; capture a new one before every reorder.
- Necromancer additively animates the individual `translate` and `scale` properties, preserving the row's authored `transform`, `translate`, and `scale`. A row that resized between capture and animate animates its size change too.

### Related

- [Stagger a List](./stagger-a-list.md)
- [FLIP Usage](../usage.md#animating-a-reorder-with-flip)
- [captureLayout() API](../api.md#capturelayout)

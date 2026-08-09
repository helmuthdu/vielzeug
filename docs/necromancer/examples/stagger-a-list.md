---
title: 'Necromancer Examples — Stagger a List'
description: 'Reveal a list in sequence with @vielzeug/necromancer.'
---

## Stagger a List

### Problem

You need list rows to enter in a stable sequence after rendering. This uses `animateEach()` with a keyframe factory and `stagger`.

### Solution

Build the rows, then stagger their entry in DOM order.

```ts
import { animateEach } from '@vielzeug/necromancer';

const list = document.createElement('ul');
const rows = ['Inbox', 'Today', 'Upcoming'].map((label) => {
  const row = document.createElement('li');
  row.textContent = label;
  list.append(row);
  return row;
});
document.body.append(list);

const group = animateEach(
  rows,
  (_row, index) => [
    { opacity: 0, transform: `translateX(${12 + index * 2}px)` },
    { opacity: 1, transform: 'translateX(0)' },
  ],
  { duration: 180, easing: 'ease-out', stagger: 50 },
);

await group.results;
group.dispose();
```

### Pitfalls

- `animateEach()` de-duplicates elements in first-seen order.
- Keep `delay` numeric when `stagger` is non-zero because Necromancer adds the stagger offset to it.
- Dispose the group if the owning list unmounts before every child completes.

### Related

- [Animate on Mount](./animate-on-mount.md)
- [Animate a Reorder](./animate-a-reorder.md)
- [animateEach() API](../api.md#animateeach)

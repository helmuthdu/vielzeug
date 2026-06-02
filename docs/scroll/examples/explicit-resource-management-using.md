---
title: 'Scroll Examples — Explicit Resource Management (`using`)'
description: 'Explicit Resource Management (`using`) examples for scroll.'
---

## Explicit Resource Management (`using`)

### Problem

You create a virtualizer inside a function or block scope and want it destroyed automatically when the block exits — without a try/finally or a manual `destroy()` call.

### Solution

```ts
import { createVirtualizer } from '@vielzeug/scroll';

function renderList(scrollEl: HTMLElement, rows: string[]) {
  using virt = createVirtualizer(scrollEl, {
    count: rows.length,
    estimateSize: 36,
    onChange: ({ items, totalSize }) => {
      // render...
    },
  });

  // ... synchronous setup ...
} // virt.destroy() is called automatically here
```


### Pitfalls

- `using` only triggers `[Symbol.dispose]` when the declared variable goes out of scope. If you pass the virtualizer through a function before the `using` block ends, cleanup still happens at scope exit — not at the call site.
- TypeScript 5.2+ is required. Without it, the `using` keyword is a syntax error. Check `tsconfig.json` `target` and `lib` before using this pattern.
- `[Symbol.dispose]` is called synchronously on scope exit. If `destroy()` cancels async scroll animations, those animations may still be running after the `using` block exits.

### Related

- [Basic Fixed-Height List](./basic-fixed-height-list.md)
- [Density Toggle (Compact / Comfortable)](./density-toggle-compact-comfortable.md)
- [Grouped List (Headers + Rows)](./grouped-list-headers-plus-rows.md)

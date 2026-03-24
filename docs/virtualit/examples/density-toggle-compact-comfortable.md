---
title: 'Virtualit Examples — Density Toggle (Compact / Comfortable)'
description: 'Density Toggle (Compact / Comfortable) examples for virtualit.'
---

## Density Toggle (Compact / Comfortable)

## Problem

Implement density toggle (compact / comfortable) in a production-friendly way with `@vielzeug/virtualit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/virtualit` installed.

Use the `estimateSize` setter to switch between density modes. Measured heights from the previous mode are automatically cleared.

```ts
import { createVirtualizer } from '@vielzeug/virtualit';

const DENSITY = { compact: 32, comfortable: 48 };
let mode: keyof typeof DENSITY = 'comfortable';

const virt = createVirtualizer(scrollEl, {
  count: rows.length,
  estimateSize: DENSITY[mode],
  onChange: render,
});

document.getElementById('toggle-density')!.addEventListener('click', () => {
  mode = mode === 'compact' ? 'comfortable' : 'compact';
  virt.estimateSize = DENSITY[mode];
});
```

---

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Basic Fixed-Height List](./basic-fixed-height-list.md)
- [Explicit Resource Management (`using`)](./explicit-resource-management-using.md)
- [Grouped List (Headers + Rows)](./grouped-list-headers-plus-rows.md)

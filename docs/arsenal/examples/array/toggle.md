---
title: 'Arsenal Examples — toggle'
description: 'toggle example for @vielzeug/arsenal.'
---

## toggle

### Problem

You have a multi-select list and need to add an item if it's absent or remove it if it's already present — the standard checkbox toggle pattern.

### Solution

Use `toggle(array, item, selector?, options?)` to return a new array with the item added or removed.

```ts
import { toggle } from '@vielzeug/arsenal';

toggle(['ts', 'node', 'vue'], 'ts');    // ['node', 'vue']  — removed
toggle(['ts', 'node', 'vue'], 'react'); // ['ts', 'node', 'vue', 'react'] — added
```

#### With selector for objects

```ts
import { toggle } from '@vielzeug/arsenal';

const tags = [{ id: 1, name: 'ts' }, { id: 2, name: 'node' }];
toggle(tags, { id: 1, name: 'ts' }, (t) => t.id);
// [{ id: 2, name: 'node' }]
```

### Pitfalls

- Without a selector, uses deep equality — pass a selector for object arrays.

### Related

- [replace](./replace.md)
- [uniq](./uniq.md)

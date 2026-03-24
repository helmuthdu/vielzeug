<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
</div>

# toggle

The `toggle` utility either **adds** or **removes** an item from an array depending on whether it already exists, making it ideal for selection UIs, tag pickers, and toggleable lists.

## Source Code

::: details View Source Code
<<< @/../packages/toolkit/src/array/toggle.ts
:::

## Features

- **Immutable**: Returns a new array; never mutates the original.
- **Primitive or object**: Works with primitives by default, or objects via a selector.
- **Prepend or append**: Control insertion position with the `strategy` option.

## API

```ts
function toggle<T>(
  array: T[],
  item: T,
  selector?: (item: T) => Primitive,
  options?: { strategy?: 'prepend' | 'append' },
): T[];
```

### Parameters

- `array`: The source array.
- `item`: The item to add or remove.
- `selector`: Optional function to derive a comparable identity (for objects).
- `options.strategy`: Where to insert when adding — `'append'` (default) or `'prepend'`.

### Returns

- A new array with the item added or removed.

## Examples

### Toggle Primitives

```ts
import { toggle } from '@vielzeug/toolkit';

toggle([1, 2, 3], 4); // [1, 2, 3, 4]  — added
toggle([1, 2, 3], 2); // [1, 3]         — removed
```

### Toggle Objects with Selector

```ts
import { toggle } from '@vielzeug/toolkit';

const selected = [{ id: 1 }, { id: 2 }];

// Add a new item
toggle(selected, { id: 3 }, (o) => o.id);
// [{ id: 1 }, { id: 2 }, { id: 3 }]

// Remove an existing item
toggle(selected, { id: 1 }, (o) => o.id);
// [{ id: 2 }]
```

### Prepend Strategy

```ts
import { toggle } from '@vielzeug/toolkit';

toggle([1, 2, 3], 4, undefined, { strategy: 'prepend' });
// [4, 1, 2, 3]
```

### Tag Picker UI

```ts
import { toggle } from '@vielzeug/toolkit';
import { useState } from 'react';

function TagPicker({ allTags }: { allTags: string[] }) {
  const [selected, setSelected] = useState<string[]>([]);

  return allTags.map((tag) => (
    <button
      key={tag}
      onClick={() => setSelected((prev) => toggle(prev, tag))}
      style={{ fontWeight: selected.includes(tag) ? 'bold' : 'normal' }}
    >
      {tag}
    </button>
  ));
}
```

## See Also

- [replace](./replace.md): Replace the first matching element with a new value.
- [select](./select.md): Filter elements by a predicate.

<style>
.badges { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
</style>

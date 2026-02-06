<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1329_B-success" alt="Size">
</div>

# alternate

The `alternate` utility toggles an item's presence in an array. If the item exists (based on a value or a custom selector), it is removed. If it doesn't exist, it is added to the array using a specified strategy.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/array/alternate.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Smart Toggling**: Automatically handles addition and removal logic.
- **Custom Uniqueness**: Support for complex objects via a selector function.
- **Flexible Positioning**: Control where new items are added (prepend or append).

## API

```ts
function alternate<T>(
  array: T[], 
  item: T, 
  selector?: (item: T) => Primitive, 
  options?: { strategy?: 'prepend' | 'append' }
): T[]
```

### Parameters

- `array`: The array to modify.
- `item`: The item to toggle.
- `selector`: Optional. A function that returns a primitive value used to determine uniqueness (defaults to direct comparison).
- `options`: Optional configuration:
  - `strategy`: Where to add the item if it's missing ('prepend' or 'append', defaults to 'append').

### Returns

- A new array with the item either added or removed.

## Examples

### Toggling Primitives

```ts
import { alternate } from '@vielzeug/toolkit';

const numbers = [1, 2, 3];

// Add 4
alternate(numbers, 4); // [1, 2, 3, 4]

// Remove 2
alternate(numbers, 2); // [1, 3]
```

### Toggling Objects with a Selector

```ts
import { alternate } from '@vielzeug/toolkit';

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];
const newUser = { id: 3, name: 'Charlie' };
const existingUser = { id: 1, name: 'Alice Smith' };

// Toggle based on ID
const result1 = alternate(users, newUser, (u) => u.id);
// [{ id: 1, ... }, { id: 2, ... }, { id: 3, ... }]

const result2 = alternate(users, existingUser, (u) => u.id);
// [{ id: 2, name: 'Bob' }]
```

### Using a Custom Strategy

```ts
import { alternate } from '@vielzeug/toolkit';

const list = ['B', 'C'];

// Add 'A' to the beginning
alternate(list, 'A', undefined, { strategy: 'prepend' }); // ['A', 'B', 'C']
```

## Implementation Notes

- Returns a new array; the original array is never mutated.
- When removing, all instances matching the item (or selector result) are removed.
- Throws `TypeError` if the first argument is not an array.

## See Also

- [filter](./filter.md): Manually remove items from an array.
- [uniq](./uniq.md): Ensure all elements in an array are unique.
- [aggregate](./aggregate.md): Transform arrays into lookup objects.

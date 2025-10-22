# alternate

Adds or removes an item from an array, depending on whether it already exists. Supports custom uniqueness and add strategy.

## API

```ts
alternate<T>(
  array: T[],
  item: T,
  selector?: (item: T) => Primitive,
  options?: { strategy?: 'prepend' | 'append' },
): T[]
```

- `array`: The array to modify.
- `item`: The item to add or remove.
- `selector`: Optional function to determine uniqueness (e.g., `item => item.id`).
- `options`: Optional object with `strategy` ('prepend' or 'append', default: 'append').

### Returns

- A new array with the item added (if not present) or removed (if present).

## Example

```ts
import { alternate } from '@vielzeug/toolkit';

alternate([1, 2, 3], 4); // [1, 2, 3, 4]
alternate([1, 2, 3], 2); // [1, 3]
alternate([{ id: 1 }, { id: 2 }], { id: 3 }, (obj) => obj.id, { strategy: 'prepend' }); // [{ id: 3 }, { id: 1 }, { id: 2 }]
```

## Notes

- If the item exists, it is removed; otherwise, it is added.
- The selector function allows custom uniqueness logic (e.g., for objects).
- The `strategy` option controls where the item is added.

## See also

- [map](./map.md)

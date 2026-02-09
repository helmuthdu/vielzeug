<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-435_B-success" alt="Size">
</div>

# clone

The `clone` utility creates a complete deep copy of an object or array. This ensures that any modifications made to the cloned version do not affect the original data structure, which is essential for maintaining immutability in complex applications.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/object/clone.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Deep Copy**: Recursively copies all nested properties.
- **Support for Complex Types**: Correctly handles nested arrays and objects.
- **Type-safe**: Properly preserves the type of the input value in the result.

## API

```ts
function clone<T>(value: T): T;
```

### Parameters

- `value`: The object, array, or primitive to clone.

### Returns

- A deep copy of the input value.

## Examples

### Deep Cloning an Object

```ts
import { clone } from '@vielzeug/toolkit';

const original = {
  id: 1,
  meta: {
    tags: ['new', 'featured'],
    settings: { theme: 'dark' },
  },
};

const copy = clone(original);

// Modifying the copy doesn't affect the original
copy.meta.settings.theme = 'light';
copy.meta.tags.push('archived');

console.log(original.meta.settings.theme); // 'dark'
console.log(original.meta.tags.length); // 2
```

### Cloning Arrays

```ts
import { clone } from '@vielzeug/toolkit';

const list = [
  [1, 2],
  [3, 4],
];
const listCopy = clone(list);

listCopy[0].push(3);
console.log(list[0]); // [1, 2]
```

## Implementation Notes

- Performance-optimized deep cloning logic.
- For specialized objects like `Date` or `RegExp`, it creates new instances with the same values.
- Does not clone functions (they are copied by reference).
- Be cautious with circular references, as they may cause a stack overflow.

## See Also

- [merge](./merge.md): Combine multiple objects.
- [diff](./diff.md): Find differences between two objects.
- [isEqual](../typed/isEqual.md): Check for deep equality.

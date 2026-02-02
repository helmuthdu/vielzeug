# merge

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-4078_B-success" alt="Size">
</div>

The `merge` utility combines multiple objects into a single new object using a variety of configurable strategies.

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Immutable**: Never mutates the source objects; always returns a new object.
- **Multiple Strategies**: Built-in support for deep, shallow, array-specific, and custom merging.
- **Type-safe**: Properly merges types and handles multiple input objects.

## API

```ts
type MergeStrategy =
  | 'deep'
  | 'shallow'
  | 'lastWins'
  | 'arrayConcat'
  | 'arrayReplace'
  | ((target: any, source: any) => any);

interface MergeFunction {
  <T extends object[]>(strategy: MergeStrategy, ...items: T): any;
}
```

### Parameters

- `strategy`: The merging algorithm to use:
  - `'deep'`: Recursively merges nested objects and arrays (default-like behavior).
  - `'shallow'`: Performs a shallow merge (similar to `Object.assign`).
  - `'lastWins'`: Only the last object's value for a given key is kept.
  - `'arrayConcat'`: Deep merge, but arrays are concatenated.
  - `'arrayReplace'`: Deep merge, but arrays are replaced by the later value.
  - `custom function`: A function `(target, source) => mergedValue` for fine-grained control.
- `...items`: Two or more objects to merge.

### Returns

- A new object containing the merged results.

## Examples

### Deep vs. Shallow Merge

```ts
import { merge } from '@vielzeug/toolkit';

const obj1 = { a: 1, b: { x: 10 } };
const obj2 = { b: { y: 20 } };

merge('deep', obj1, obj2);    // { a: 1, b: { x: 10, y: 20 } }
merge('shallow', obj1, obj2); // { a: 1, b: { y: 20 } }
```

### Array Strategies

```ts
import { merge } from '@vielzeug/toolkit';

const defaults = { tags: ['new'] };
const overrides = { tags: ['featured'] };

merge('arrayConcat', defaults, overrides);  // { tags: ['new', 'featured'] }
merge('arrayReplace', defaults, overrides); // { tags: ['featured'] }
```

### Custom Merge Strategy

```ts
import { merge } from '@vielzeug/toolkit';

const custom = (target, source) => {
  if (typeof target === 'number' && typeof source === 'number') {
    return target + source; // Sum numbers instead of replacing
  }
  return source;
};

merge(custom, { val: 10 }, { val: 5 }); // { val: 15 }
```

## Implementation Notes

- Throws `TypeError` if fewer than two objects are provided.
- Circular references in source objects may cause a stack overflow during deep merge.
- The `deep` strategy treats `Date`, `RegExp`, and other built-in objects as primitives (cloning them but not merging their internals).

## See Also

- [clone](./clone.md): Create a deep copy of a single object.
- [diff](./diff.md): Find the differences between two objects.
- [patch](./patch.md): Apply a diff to an object.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>

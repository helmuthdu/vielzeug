<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1237_B-success" alt="Size">
</div>

# diff

The `diff` utility compares two objects and returns an object containing only the properties that were changed or added in the second object. This is ideal for change tracking, auditing, and generating minimal data patches.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/object/diff.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Minimal Output**: Only returns what has actually changed.
- **Deep Comparison**: Correctly identifies differences even in nested objects.
- **Type-safe**: Preserves typing for partially changed objects.

## API

```ts
function diff<T extends object, U extends object>(a: T, b: U): Partial<T & U>;
```

### Parameters

- `a`: The base (original) object.
- `b`: The target (updated) object to compare against the base.

### Returns

- A new object representing the delta between `a` and `b`.

## Examples

### Basic Diff

```ts
import { diff } from '@vielzeug/toolkit';

const original = { id: 1, status: 'pending', tags: ['new'] };
const updated = { id: 1, status: 'active', tags: ['new'], priority: 'high' };

const result = diff(original, updated);
// { status: 'active', priority: 'high' }
```

### Nested Object Diff

```ts
import { diff } from '@vielzeug/toolkit';

const v1 = {
  user: {
    name: 'Alice',
    settings: { theme: 'dark' },
  },
};

const v2 = {
  user: {
    name: 'Alice',
    settings: { theme: 'light' },
  },
};

diff(v1, v2);
// { user: { settings: { theme: 'light' } } }
```

## Implementation Notes

- Returns properties from `b` that are different from `a`.
- Uses deep equality (`isEqual`) for comparisons.
- If a property exists in `a` but is missing in `b`, it is currently not included in the diff (use for "update/patch" logic).
- Throws `TypeError` if either argument is not an object.

## See Also

- [merge](./merge.md): Combine objects (often used with the result of `diff`).
- [clone](./clone.md): Create a copy of an object.
- [isEqual](../typed/isEqual.md): The comparison engine used by `diff`.

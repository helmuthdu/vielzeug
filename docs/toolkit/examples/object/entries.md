<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-799_B-success" alt="Size">
</div>

# entries

The `entries` utility returns an array of an object's own enumerable string-keyed property `[key, value]` pairs. It is a type-safe wrapper around the native `Object.entries()`, providing significantly better type inference for the resulting tuples.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/object/entries.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Type-safe**: Tuples are correctly typed as `[keyof T, T[keyof T]]` rather than `[string, any]`.
- **Enumerable Only**: Consistent with native behavior, only includes own enumerable properties.

## API

```ts
function entries<T extends object>(obj: T): [keyof T, T[keyof T]][];
```

### Parameters

- `obj`: The object whose entries should be extracted.

### Returns

- An array of `[key, value]` pairs.

## Examples

### Basic Usage

```ts
import { entries } from '@vielzeug/toolkit';

const settings = {
  theme: 'dark',
  notifications: true,
  retries: 3,
};

const settingPairs = entries(settings);
/*
[
  ['theme', 'dark'],
  ['notifications', true],
  ['retries', 3]
]
*/
```

### Iterating with Better Types

```ts
import { entries, map } from '@vielzeug/toolkit';

const counts = { a: 10, b: 20 };

// key and value are properly typed in the callback
const summary = map(entries(counts), ([key, val]) => {
  return `${key.toUpperCase()}: ${val}`;
});
// ['A: 10', 'B: 20']
```

## Implementation Notes

- Internally calls `Object.entries(obj)`.
- Does not include properties from the prototype chain.
- If the argument is not an object, it may throw depending on the environment (similar to native `Object.entries`).

## See Also

- [keys](./keys.md): Extract only the keys from an object.
- [values](./values.md): Extract only the values from an object.
- [path](./path.md): Retrieve a value at a specific path.

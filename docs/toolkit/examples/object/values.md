<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-667_B-success" alt="Size">
</div>

# values

The `values` utility returns an array of an object's own enumerable property values. It is a type-safe wrapper around the native `Object.values()`, providing better type inference for the elements in the resulting array.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/object/values.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Type-safe**: The resulting array is typed based on the values of the input object.
- **Enumerable Only**: Consistent with native behavior, only includes values of own enumerable properties.

## API

```ts
interface ValuesFunction {
  <T extends Record<string, any>>(obj: T): T[keyof T][];
}
```

### Parameters

- `obj`: The object whose values should be extracted.

### Returns

- An array containing the object's values.

## Examples

### Basic Usage

```ts
import { values } from '@vielzeug/toolkit';

const scores = {
  alice: 100,
  bob: 85,
  charlie: 92,
};

const allScores = values(scores);
// [100, 85, 92]
```

### Mixed Type Values

```ts
import { values } from '@vielzeug/toolkit';

const mixed = {
  id: 1,
  active: true,
  name: 'System',
};

const data = values(mixed); // Typed as (string | number | boolean)[]
```

## Implementation Notes

- Internally calls `Object.values(obj)`.
- Does not include values from properties in the prototype chain.
- If the argument is not an object, it may throw depending on the environment (similar to native `Object.values`).

## See Also

- [keys](./keys.md): Extract the keys from an object.
- [entries](./entries.md): Extract both keys and values as pairs.
- [path](./path.md): Retrieve a value at a specific path.

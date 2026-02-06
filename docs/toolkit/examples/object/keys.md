<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-620_B-success" alt="Size">
</div>

# keys

The `keys` utility returns an array of an object's own enumerable property names. It is a type-safe wrapper around the native `Object.keys()`, providing better type inference for the resulting array.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/object/keys.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Type-safe**: The resulting array is typed as `(keyof T)[]` rather than just `string[]`.
- **Enumerable Only**: Consistent with native behavior, only includes own enumerable properties.

## API

```ts
function keys<T extends object>(obj: T): (keyof T)[]
```

### Parameters

- `obj`: The object whose keys should be extracted.

### Returns

- An array containing the object's keys.

## Examples

### Basic Usage

```ts
import { keys } from '@vielzeug/toolkit';

const user = {
  id: 1,
  name: 'Alice',
  role: 'admin',
};

const userKeys = keys(user);
// ['id', 'name', 'role']
```

### Type Inference

```ts
import { keys } from '@vielzeug/toolkit';

interface Config {
  port: number;
  host: string;
}

const config: Config = { port: 8080, host: 'localhost' };
const cKeys = keys(config); // Typed as ('port' | 'host')[]
```

## Implementation Notes

- Internally calls `Object.keys(obj)`.
- Does not include keys from the prototype chain.
- If the argument is not an object (e.g., `null`), it may throw depending on the environment (similar to native `Object.keys`).

## See Also

- [values](./values.md): Extract the values from an object.
- [entries](./entries.md): Extract both keys and values as pairs.
- [path](./path.md): Retrieve a value at a specific path.

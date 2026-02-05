<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-2617_B-success" alt="Size">
</div>

# path

The `path` utility safely retrieves a nested value from an object using a dot-notation string or an array of keys. It prevents runtime errors when accessing properties of `undefined` or `null` objects and supports a customizable fallback value.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/object/path.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Safe Access**: Never throws if a parent property is missing.
- **Flexible Path Formats**: Use dot-notation (`'a.b.c'`) or an array of keys (`['a', 'b', 'c']`).
- **Default Value Support**: Provide a fallback value for missing paths.
- **Type-safe**: Supports generic return types for better autocompletion.

## API

```ts
interface PathOptions {
  throwOnMissing?: boolean;
  allowArrayIndex?: boolean;
}

interface PathFunction {
  <T = any>(obj: any, path: string, fallback?: T, options?: PathOptions): T | undefined;
}
```

### Parameters

- `obj`: The object to query.
- `path`: The path to the desired property as a dot-separated string.
- `fallback`: Optional. A value to return if the path does not exist or resolves to `undefined`.
- `options`: Optional configuration:
  - `throwOnMissing`: If `true`, throws an error instead of returning the fallback value (defaults to `false`).
  - `allowArrayIndex`: If `true`, supports bracket notation for array indices (e.g., `'d[1]'`) (defaults to `false`).

### Returns

- The value at the specified path, or the `fallback` value, or `undefined`.

## Examples

### Basic Nested Access

```ts
import { path } from '@vielzeug/toolkit';

const config = {
  api: {
    endpoints: {
      login: '/api/v1/login',
    },
  },
};

path(config, 'api.endpoints.login'); // '/api/v1/login'
path(config, 'api.version'); // undefined
path(config, 'api.version', 'v1'); // 'v1'
```

### Using Array Index with allowArrayIndex

```ts
import { path } from '@vielzeug/toolkit';

const data = {
  users: [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ],
};

// Access array index with bracket notation
path(data, 'd[1]', undefined, { allowArrayIndex: true }); // 2
path(data, 'users[0].name', undefined, { allowArrayIndex: true }); // 'Alice'
```

### Throwing on Missing Paths

```ts
import { path } from '@vielzeug/toolkit';

const obj = { a: { b: 1 } };

// Throws an error instead of returning fallback
path(obj, 'e.f.g', 'default', { throwOnMissing: true }); // throws Error
```

## Implementation Notes

- Performance-optimized for deep traversal.
- Correctly handles numeric keys for array indexing within paths.
- Returns the fallback value if the resolved value is strictly `undefined`.

## See Also

- [seek](./seek.md): Find a value anywhere in an object by key.
- [merge](./merge.md): Combine objects.
- [clone](./clone.md): Create a copy of an object.

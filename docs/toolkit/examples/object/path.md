<div class="badges">
  <img src="https://img.shields.io/badge/version-1.1.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-2617_B-success" alt="Size">
</div>

# get

The `get` utility safely retrieves a nested value from an object using a dot-notation path string. It prevents runtime errors when accessing properties of `undefined` or `null` intermediate objects and supports an optional default value.

## Source Code

::: details View Source Code
<<< @/../packages/toolkit/src/object/path.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Safe Access**: Never throws if a parent is `null` or `undefined` (unless `throwOnMissing` is set).
- **Dot & Bracket Notation**: Supports `'a.b.c'` and `'a[0].b'` path formats.
- **Default Value**: Provide a fallback value for missing or `undefined` paths.
- **Type-safe**: Generic return type with full TypeScript inference.

## API

::: details Type Definitions
<<< @/../packages/toolkit/src/object/path.ts#PathOptions
:::

```ts
function get<T extends object, P extends string>(
  item: T,
  path: P,
  defaultValue?: unknown,
  options?: PathOptions,
): unknown;
```

### Parameters

- `item`: The object to query.
- `path`: The path to the desired property as a dot-separated (or bracket-notation) string.
- `defaultValue`: Optional. A value returned when the path is missing or resolves to `undefined`.
- `options`: Optional configuration:
  - `throwOnMissing`: If `true`, throws an `Error` instead of returning the default value.

### Returns

The value at the path, the `defaultValue`, or `undefined`.

## Examples

### Basic Nested Access

```ts
import { get } from '@vielzeug/toolkit';

const config = {
  api: {
    endpoints: {
      login: '/api/v1/login',
    },
  },
};

get(config, 'api.endpoints.login'); // '/api/v1/login'
get(config, 'api.version'); // undefined
get(config, 'api.version', 'v1'); // 'v1' (default value)
```

### Array Index Access

```ts
import { get } from '@vielzeug/toolkit';

const data = {
  users: [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ],
};

get(data, 'users[0].name'); // 'Alice'
get(data, 'users[1].id'); // 2
```

### Throwing on Missing Paths

```ts
import { get } from '@vielzeug/toolkit';

const obj = { a: { b: 1 } };

// Throws an error instead of returning the default value
get(obj, 'e.f.g', undefined, { throwOnMissing: true }); // throws Error
```

## Implementation Notes

- Bracket notation (`[0]`) is parsed and treated as a key automatically.
- Returns `defaultValue` only when the resolved value is `undefined`; `null` is returned as-is.

## See Also

- [seek](./seek.md): Recursively search object values by similarity score.
- [merge](./merge.md): Combine multiple objects together.

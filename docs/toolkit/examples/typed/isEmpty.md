<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-212_B-success" alt="Size">
</div>

# isEmpty

The `isEmpty` utility checks if a given value is considered "empty". It supports a wide variety of data types, including strings, arrays, objects, Maps, and Sets.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isEmpty.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Versatile**: Handles strings (length 0), arrays (length 0), objects (no enumerable keys), and collection types (size 0).
- **Safe**: Properly handles `null` and `undefined` (considering them empty).

## API

```ts
function isEmpty(value: unknown): boolean
```

### Parameters

- `value`: The value to check for emptiness.

### Returns

- `true` if the value is empty; otherwise, `false`.

## Examples

### Checking Collections

```ts
import { isEmpty } from '@vielzeug/toolkit';

isEmpty([]); // true
isEmpty([1, 2, 3]); // false

isEmpty(new Set()); // true
isEmpty(new Map()); // true
```

### Checking Strings & Objects

```ts
import { isEmpty } from '@vielzeug/toolkit';

isEmpty(''); // true
isEmpty('hello'); // false

isEmpty({}); // true
isEmpty({ a: 1 }); // false
```

### Checking Nullable Values

```ts
import { isEmpty } from '@vielzeug/toolkit';

isEmpty(null); // true
isEmpty(undefined); // true
```

## Implementation Notes

- For objects, it checks for own enumerable property names using `Object.keys()`.
- For `Map` and `Set`, they are treated as objects. An empty Map or Set will return `true` since `Object.keys()` returns an empty array for them.
- For all other types (numbers, booleans, etc.), it returns `false` unless the value is `null` or `undefined`.

## See Also

- [isNil](./isNil.md): Check if a value is strictly `null` or `undefined`.
- [isDefined](./isDefined.md): Check if a value is not `null` or `undefined`.
- [isArray](./isArray.md): Check if a value is an array.

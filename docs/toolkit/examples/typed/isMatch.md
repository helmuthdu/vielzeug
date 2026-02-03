<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-212_B-success" alt="Size">
</div>

# isMatch

The `isMatch` utility checks if an object contains a specific pattern of properties and values. It performs a partial comparison, meaning the checked object can have additional properties not present in the pattern.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isMatch.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Partial Matching**: Only verifies the keys specified in the pattern.
- **Regex Support**: Allows matching string values against Regular Expressions.
- **Deep Matching**: Recursively checks nested objects within the pattern.

## API

```ts
interface IsMatchFunction {
  (obj: any, pattern: any): boolean;
}
```

### Parameters

- `obj`: The object to validate.
- `pattern`: The shape or values to match against.

### Returns

- `true` if the object matches the pattern; otherwise, `false`.

## Examples

### Partial Object Match

```ts
import { isMatch } from '@vielzeug/toolkit';

const user = { id: 1, name: 'Alice', role: 'admin', active: true };

// Only check name and role
isMatch(user, { name: 'Alice', role: 'admin' }); // true

// Missing property in pattern is fine
isMatch(user, { id: 1 }); // true
```

### Regular Expression Matching

```ts
import { isMatch } from '@vielzeug/toolkit';

const product = { sku: 'PROD-123', category: 'electronics' };

// Match SKU using a regex
isMatch(product, { sku: /^PROD-/ }); // true
```

### Nested Pattern Matching

```ts
import { isMatch } from '@vielzeug/toolkit';

const data = {
  meta: {
    status: 200,
    tags: ['new'],
  },
};

isMatch(data, { meta: { status: 200 } }); // true
```

## Implementation Notes

- Uses deep equality (`isEqual`) for non-primitive values in the pattern.
- If a value in the pattern is a `RegExp`, it tests the corresponding value in the object using `.test()`.
- Throws nothing; safely handles `null`, `undefined`, and non-object inputs by returning `false`.

## See Also

- [isEqual](./isEqual.md): Check for total structural identity.
- [search](../array/search.md): Fuzzy search across objects in an array.
- [path](../object/path.md): Retrieve a specific nested value.

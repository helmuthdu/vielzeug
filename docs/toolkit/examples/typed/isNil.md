<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-64_B-success" alt="Size">
</div>

# isNil

The `isNil` utility is a type guard that checks if a value is strictly `null` or `undefined`. It is the inverse of `isDefined` and is useful for identifying missing or uninitialized data.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isNil.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Type Guard**: Automatically narrows types to `null | undefined` within conditional blocks.
- **Precise**: Correctly identifies that `0`, `false`, and `''` are NOT nil.

## API

```ts
function isNil(value: unknown): value is null | undefined
```

### Parameters

- `value`: The value to check.

### Returns

- `true` if the value is `null` or `undefined`; otherwise, `false`.

## Examples

### Basic Usage

```ts
import { isNil } from '@vielzeug/toolkit';

isNil(null); // true
isNil(undefined); // true
isNil(0); // false
isNil(''); // false
isNil(false); // false
```

### Type Guarding

```ts
import { isNil } from '@vielzeug/toolkit';

function cleanup(text: string | null | undefined) {
  if (isNil(text)) {
    return 'default';
  }
  // text is now narrowed to 'string'
  return text.trim();
}
```

## Implementation Notes

- Returns `true` if `value === null || value === undefined`.
- Throws nothing; safe for any input type.

## See Also

- [isDefined](./isDefined.md): The inverse check (returns true for defined values).
- [isEmpty](./isEmpty.md): Check if a value is empty (broader than just nil).
- [isArray](./isArray.md): Dedicated array type guard.

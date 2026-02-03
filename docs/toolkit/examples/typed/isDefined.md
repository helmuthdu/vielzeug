<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-64_B-success" alt="Size">
</div>

# isDefined

The `isDefined` utility is a type guard that checks if a value is NOT `undefined` or `null`. It is essential for safely handling optional values and cleaning up data sets.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isDefined.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Type Guard**: Automatically narrows types to exclude `null` and `undefined`.
- **Durable**: Unlike a simple truthiness check, it correctly identifies `0`, `false`, and `''` as defined values.

## API

```ts
interface IsDefinedFunction {
  <T>(value: T | undefined | null): value is T;
}
```

### Parameters

- `value`: The value to check.

### Returns

- `true` if the value is neither `null` nor `undefined`; otherwise, `false`.

## Examples

### Basic Usage

```ts
import { isDefined } from '@vielzeug/toolkit';

isDefined('hello'); // true
isDefined(0); // true
isDefined(false); // true
isDefined(null); // false
isDefined(undefined); // false
```

### Filtering Arrays

```ts
import { isDefined, filter } from '@vielzeug/toolkit';

const data = ['a', undefined, 'b', null, 'c'];

// TypeScript correctly infers the result as string[]
const cleanData = filter(data, isDefined);
// ['a', 'b', 'c']
```

## Implementation Notes

- Returns `true` if `value !== undefined && value !== null`.
- Throws nothing; safe for any input type.

## See Also

- [isNil](./isNil.md): The inverse check (returns true for null/undefined).
- [isEmpty](./isEmpty.md): Check if a value is empty (includes length checks).
- [compact](../array/compact.md): Remove all falsy values from an array.

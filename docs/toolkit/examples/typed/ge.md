<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-64_B-success" alt="Size">
</div>

# ge

The `ge` utility checks if the first value is greater than or equal to the second value. It works with any comparable types, including numbers, strings, and Dates.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/ge.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Versatile**: Supports multiple data types.
- **Type-safe**: Properly typed for comparable inputs.

## API

```ts
function ge(a: number, b: number): boolean
```

### Parameters

- `a`: The value to compare.
- `b`: The value to compare against.

### Returns

- `true` if `a >= b`; otherwise, `false`.

## Examples

### Basic Usage

```ts
import { ge } from '@vielzeug/toolkit';

ge(10, 5); // true
ge(5, 5); // true
ge(3, 10); // false
ge('b', 'a'); // true
```

## Implementation Notes

- Returns `true` if `a >= b`.
- Uses standard JavaScript comparison rules.
- Throws nothing; safe for any comparable types.

## See Also

- [gt](./gt.md): Greater than.
- [le](./le.md): Less than or equal to.
- [lt](./lt.md): Less than.

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-64_B-success" alt="Size">
</div>

# gt

The `gt` utility checks if the first value is strictly greater than the second value. It works with any comparable types, including numbers, strings, and Dates.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/gt.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Versatile**: Supports multiple data types.
- **Type-safe**: Properly typed for comparable inputs.

## API

```ts
interface GTFunction {
  <T>(a: T, b: T): boolean
}
```

### Parameters

- `a`: The value to compare.
- `b`: The value to compare against.

### Returns

- `true` if `a > b`; otherwise, `false`.

## Examples

### Basic Usage

```ts
import { gt } from '@vielzeug/toolkit';

gt(10, 5);    // true
gt(5, 10);    // false
gt(5, 5);     // false
gt('b', 'a'); // true
```

## Implementation Notes

- Returns `true` if `a > b`.
- Uses standard JavaScript comparison rules.
- Throws nothing; safe for any comparable types.

## See Also

- [ge](./ge.md): Greater than or equal to.
- [lt](./lt.md): Less than.
- [le](./le.md): Less than or equal to.
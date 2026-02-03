<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-64_B-success" alt="Size">
</div>

# le

The `le` utility checks if the first value is less than or equal to the second value. It works with any comparable types, including numbers, strings, and Dates.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/le.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Versatile**: Supports multiple data types.
- **Type-safe**: Properly typed for comparable inputs.

## API

```ts
interface LEFunction {
  <T>(a: T, b: T): boolean;
}
```

### Parameters

- `a`: The value to compare.
- `b`: The value to compare against.

### Returns

- `true` if `a <= b`; otherwise, `false`.

## Examples

### Basic Usage

```ts
import { le } from '@vielzeug/toolkit';

le(5, 10); // true
le(5, 5); // true
le(10, 3); // false
le('a', 'b'); // true
```

## Implementation Notes

- Returns `true` if `a <= b`.
- Uses standard JavaScript comparison rules.
- Throws nothing; safe for any comparable types.

## See Also

- [lt](./lt.md): Less than.
- [ge](./ge.md): Greater than or equal to.
- [gt](./gt.md): Greater than.

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-553_B-success" alt="Size">
</div>

# isObject

Checks if a value is a plain object.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isObject.ts
:::

## API

```ts
isObject(value: unknown): value is object
```

- `value`: Value to check.
- Returns: `true` if value is a plain object, else `false`.

## Example

```ts
import { isObject } from '@vielzeug/toolkit';

isObject({}); // true
isObject([]); // false
isObject(null); // false
```

## Notes

- Excludes arrays, functions, and null.
- Useful for type guards and validation.

## Related

- [isArray](./isArray.md)
- [isFunction](./isFunction.md)
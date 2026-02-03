<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-658_B-success" alt="Size">
</div>

# isPrimitive

Checks if a value is a primitive type (string, number, boolean, null, undefined, symbol, or bigint).

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isPrimitive.ts
:::

## API

```ts
isPrimitive(value: unknown): boolean
```

- `value`: Value to check.
- Returns: `true` if value is a primitive, else `false`.

## Example

```ts
import { isPrimitive } from '@vielzeug/toolkit';

isPrimitive(42); // true
isPrimitive('foo'); // true
isPrimitive({}); // false
```

## Notes

- Useful for type guards and validation.

## Related

- [isObject](./isObject.md)
- [isArray](./isArray.md)
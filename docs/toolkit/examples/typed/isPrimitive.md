# isPrimitive

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-658_B-success" alt="Size">
</div>

Checks if a value is a JavaScript primitive (string, number, boolean, symbol, null, or undefined).

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

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>

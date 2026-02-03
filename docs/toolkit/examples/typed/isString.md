<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-406_B-success" alt="Size">
</div>

# isString

Checks if a value is a string.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isString.ts
:::

## API

```ts
isString(value: unknown): value is string
```

- `value`: Value to check.
- Returns: `true` if value is a string, else `false`.

## Example

```ts
import { isString } from '@vielzeug/toolkit';

isString('foo'); // true
isString(42); // false
```

## Notes

- Useful for type guards and validation.

## Related

- [isNumber](./isNumber.md)
- [isBoolean](./isBoolean.md)
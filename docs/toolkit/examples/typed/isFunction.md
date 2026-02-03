<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-529_B-success" alt="Size">
</div>

# isFunction

Checks if a value is a function.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isFunction.ts
:::

## API

```ts
isFunction(value: unknown): value is Function
```

- `value`: Value to check.
- Returns: `true` if value is a function, else `false`.

## Example

```ts
import { isFunction } from '@vielzeug/toolkit';

isFunction(() => {}); // true
isFunction(123); // false
```

## Notes

- Useful for type guards and validation.

## Related

- [isObject](./isObject.md)
- [isArray](./isArray.md)

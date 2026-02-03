<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-545_B-success" alt="Size">
</div>

# isRegex

Checks if a value is a regular expression.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isRegex.ts
:::

## API

```ts
isRegex(value: unknown): value is RegExp
```

- `value`: Value to check.
- Returns: `true` if value is a RegExp, else `false`.

## Example

```ts
import { isRegex } from '@vielzeug/toolkit';

isRegex(/abc/); // true
isRegex('abc'); // false
```

## Notes

- Useful for type guards and validation.

## Related

- [isString](./isString.md)
- [isObject](./isObject.md)
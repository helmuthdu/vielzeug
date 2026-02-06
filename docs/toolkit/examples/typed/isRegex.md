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
function isRegex(value: unknown): value is RegExp
```

### Parameters

- `value`: The value to check

### Returns

- `true` if the value is a RegExp, `false` otherwise

## Examples

### Basic Usage

```ts
import { isRegex } from '@vielzeug/toolkit';

isRegex(/abc/); // true
isRegex(new RegExp('abc')); // true
isRegex('abc'); // false
```

## Implementation Notes

- Detects both literal and constructed regular expressions
- Useful for type guards and validation

## See Also

- [isString](./isString.md): Check if value is a string
- [isObject](./isObject.md): Check if value is an object
- [typeOf](./typeOf.md): Get the type of any value

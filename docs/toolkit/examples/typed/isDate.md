# isDate

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-112_B-success" alt="Size">
</div>

The `isDate` utility is a type guard that checks if a given value is a valid JavaScript `Date` object.

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Type Guard**: Automatically narrows types to `Date` within conditional blocks.
- **Strict Check**: Only returns `true` for actual `Date` instances that are also valid (not "Invalid Date").

## API

```ts
interface IsDateFunction {
  (value: unknown): value is Date
}
```

### Parameters

- `value`: The value to check.

### Returns

- `true` if the value is a valid `Date` object; otherwise, `false`.

## Examples

### Basic Usage

```ts
import { isDate } from '@vielzeug/toolkit';

isDate(new Date());       // true
isDate(new Date('abc'));  // false (Invalid Date)
isDate('2024-01-01');     // false (String, not Date object)
isDate(Date.now());       // false (Number, not Date object)
```

### Type Guarding

```ts
import { isDate } from '@vielzeug/toolkit';

function format(val: unknown) {
  if (isDate(val)) {
    // val is narrowed to Date
    return val.toISOString();
  }
}
```

## Implementation Notes

- Returns `true` if `value instanceof Date` and `!isNaN(value.getTime())`.
- Throws nothing; safe for any input type.

## See Also

- [isNumber](./isNumber.md): Check if a value is a number.
- [isString](./isString.md): Check if a value is a string.
- [expires](../date/expires.md): Check if a date has passed.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>

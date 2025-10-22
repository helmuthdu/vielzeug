# isRegex

Checks if a value is a RegExp object.

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

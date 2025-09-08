# isFunction

Checks if a value is a function.

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

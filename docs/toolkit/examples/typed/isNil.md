# isNil

Checks if a value is `null` or `undefined`.

## API

```ts
isNil(value: unknown): value is null | undefined
```

- `value`: Value to check.
- Returns: `true` if value is `null` or `undefined`, else `false`.

## Example

```ts
import { isNil } from '@vielzeug/toolkit';

isNil(null); // true
isNil(undefined); // true
isNil(0); // false
```

## Notes

- Useful for type guards and validation.

## Related

- [isDefined](./isDefined.md)
- [isEmpty](./isEmpty.md)

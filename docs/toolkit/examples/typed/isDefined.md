# isDefined

Checks if a value is not `undefined`.

## API

```ts
isDefined<T>(value: T | undefined): value is T
```

- `value`: Value to check.
- Returns: `true` if value is not `undefined`, else `false`.

## Example

```ts
import { isDefined } from '@vielzeug/toolkit';

isDefined(0); // true
isDefined(undefined); // false
```

## Notes

- Useful for filtering out undefined values.

## Related

- [isNil](./isNil.md)
- [isEmpty](./isEmpty.md)

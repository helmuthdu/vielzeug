# isEmpty

Checks if a value is empty (array, object, string, Map, Set, etc.).

## API

```ts
isEmpty(value: unknown): boolean
```

- `value`: Value to check.
- Returns: `true` if value is empty, else `false`.

## Example

```ts
import { isEmpty } from '@vielzeug/toolkit';

isEmpty([]); // true
isEmpty({}); // true
isEmpty(''); // true
isEmpty([1]); // false
isEmpty({ a: 1 }); // false
```

## Notes

- Supports arrays, objects, strings, Maps, Sets, and more.
- Useful for validation and data checks.

## Related

- [isNil](./isNil.md)
- [isDefined](./isDefined.md)

# isMatch

Checks if an object matches the properties of a source object.

## API

```ts
isMatch(obj: object, source: object): boolean
```

- `obj`: Object to check.
- `source`: Source object with properties to match.
- Returns: `true` if `obj` matches all properties in `source`, else `false`.

## Example

```ts
import { isMatch } from '@vielzeug/toolkit';

isMatch({ a: 1, b: 2 }, { a: 1 }); // true
isMatch({ a: 1, b: 2 }, { a: 2 }); // false
```

## Notes

- Only checks own properties of the source object.
- Useful for filtering and pattern matching.

## Related

- [isEqual](./isEqual.md)
- [isObject](./isObject.md)

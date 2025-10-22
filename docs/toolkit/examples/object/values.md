# values

Returns an array of a given object's own enumerable property values.

## API

```ts
values<T extends object>(obj: T): T[keyof T][]
```

- `obj`: The object to get values from.
- Returns: Array of property values.

## Example

```ts
import { values } from '@vielzeug/toolkit';

values({ a: 1, b: 2 }); // [1, 2]
```

## Notes

- Similar to `Object.values` but with better type inference.
- Only includes own enumerable properties.

## Related

- [keys](./keys.md)
- [entries](./entries.md)

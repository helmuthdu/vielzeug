# entries

Returns an array of a given object's own enumerable string-keyed property [key, value] pairs.

## API

```ts
entries<T extends object>(obj: T): [keyof T, T[keyof T]][]
```

- `obj`: The object to get entries from.
- Returns: Array of [key, value] pairs.

## Example

```ts
import { entries } from '@vielzeug/toolkit';

entries({ a: 1, b: 2 }); // [['a', 1], ['b', 2]]
```

## Notes

- Similar to `Object.entries` but with better type inference.
- Only includes own enumerable properties.

## Related

- [keys](./keys.md)
- [values](./values.md)

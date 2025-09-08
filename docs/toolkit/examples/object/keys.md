# keys

Returns an array of a given object's own enumerable property names.

## API

```ts
keys<T extends object>(obj: T): (keyof T)[]
```

- `obj`: The object to get keys from.
- Returns: Array of property names (keys).

## Example

```ts
import { keys } from '@vielzeug/toolkit';

keys({ a: 1, b: 2 }); // ['a', 'b']
```

## Notes

- Similar to `Object.keys` but with better type inference.
- Only includes own enumerable properties.

## Related

- [entries](./entries.md)
- [values](./values.md)

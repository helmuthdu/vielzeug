# clone

Creates a deep copy of an object or array.

## API

```ts
clone<T>(value: T): T
```

- `value`: The object or array to clone.
- Returns: A deep copy of the input value.

## Example

```ts
import { clone } from '@vielzeug/toolkit';

const obj = { a: 1, b: { c: 2 } };
const copy = clone(obj);
copy.b.c = 3;
obj.b.c; // 2 (original is unchanged)
```

## Notes

- Handles objects, arrays, and primitives.
- Does not clone functions or special objects (e.g., Date, RegExp) deeply.

## Related

- [merge](./merge.md)
- [diff](./diff.md)
